import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  AXIS_X,
  AXIS_Z,
  facingOffset,
  SHAPE_FENCE,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
  TRAPDOOR_THICKNESS,
  TRAPDOOR_VARIANT_OPEN,
  TRAPDOOR_VARIANT_TOP,
} from "./voxel/blockValue.ts";
import { PANE_BLOCK_IDS } from "./voxel/blockIds.ts";
import {
  paneRects,
  SIDE_EAST,
  SIDE_NORTH,
  SIDE_SOUTH,
  SIDE_WEST,
  WALL_POST_BIT,
} from "./voxel/connectionShape.ts";
import { QUADRANT_COUNT, quadrantSides } from "./voxel/stairShape.ts";

/**
 * The unit cube every block is drawn from, with its face shading baked in.
 *
 * Voxel worlds do not light well with a shadow map. Every surface is axis
 * aligned, so a sun at a shallow angle makes flat ground shadow itself in
 * stripes, and the usual cure, biasing the shadow lookup along the surface
 * normal, pushes the sample outside the block and leaks light through the seams
 * instead. Both were visible on the terrain.
 *
 * The games this borrows from give each face a fixed brightness according to
 * which way it points, so a cube always reads as a cube whatever the light is
 * doing: bright on top, darker on the sides, darkest underneath. That is what
 * this bakes in, and it is crisp at any distance with no artefacts to tune.
 *
 * The sun is then layered on top of it for cast shadows, which needs no bias:
 * only back faces are written into the shadow map, so a lit face is never
 * closer than its own recorded depth and cannot shadow itself.
 */
/**
 * Face brightness, in the linear space vertex colours are multiplied in.
 *
 * The familiar values are 1, 0.8, 0.6 and 0.5, but those describe how the
 * result should look after conversion back to sRGB for the screen, so they are
 * raised to 2.2 here. They are also pulled up from a straight conversion,
 * because the sun now contributes shading of its own on top of this and the two
 * together would otherwise leave the shaded sides almost black.
 */
const FACE_BRIGHTNESS = {
  top: 1,
  bottom: 0.42,
  /** North and south, the faces along Z. */
  northSouth: 0.74,
  /** East and west, the faces along X. Darker, so adjacent sides differ. */
  eastWest: 0.55,
};

/**
 * One axis-aligned part of a block, textured as though the texture were
 * projected through the cell.
 *
 * Every face takes the slice of the texture its own position covers, worked
 * out from the vertex and the direction the face points. That is what the
 * games this borrows from do, and it is the whole reason a sandstone stair
 * needs no special handling: a face pointing up gets top texture, a face
 * pointing sideways gets side texture, and each gets the part of it that lines
 * up with where the face sits in the cell.
 *
 * `min` and `max` are corners of the cell, which runs -0.5 to 0.5 on each
 * axis. The offset is baked into the geometry rather than applied to the
 * instance, so an instance always sits at the centre of its cell: the raycast
 * recovers which cell was hit by rounding that position, and the block
 * highlight is drawn there too.
 *
 * `turnEdges` turns the top and bottom texture a quarter. A glass pane's edge
 * texture is a stripe down the middle of an otherwise empty image, which only
 * lines up with a pane running north to south. Without the turn, an arm
 * running east to west samples the empty part and its top edge disappears.
 */
function boxPart(
  min: [number, number, number],
  max: [number, number, number],
  turnEdges = false,
): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  geometry.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);

  const position = geometry.attributes["position"]!;
  const normal = geometry.attributes["normal"]!;
  const uv = geometry.attributes["uv"]!;
  const colors = new Float32Array(position.count * 3);

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);

    // The signs match what BoxGeometry produces for a whole cube, so a whole
    // cube comes out of here looking exactly as it did before.
    let u: number;
    let v: number;
    let brightness: number;
    if (Math.abs(ny) > 0.5) {
      const acrossX = x + 0.5;
      const acrossZ = (ny > 0 ? z : -z) + 0.5;
      u = turnEdges ? acrossZ : acrossX;
      v = turnEdges ? acrossX : acrossZ;
      brightness = ny > 0 ? FACE_BRIGHTNESS.top : FACE_BRIGHTNESS.bottom;
    } else if (Math.abs(nx) > 0.5) {
      u = (nx > 0 ? -z : z) + 0.5;
      v = y + 0.5;
      brightness = FACE_BRIGHTNESS.eastWest;
    } else {
      u = (nz > 0 ? x : -x) + 0.5;
      v = y + 0.5;
      brightness = FACE_BRIGHTNESS.northSouth;
    }

    uv.setXY(i, u, v);
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }

  uv.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Join parts into one geometry, keeping each part's own face groups, so
 * BlockLayer's six-entry material array still lines up: index 2 is the top
 * texture, 3 the bottom, the rest the sides.
 *
 * mergeGeometries groups by part rather than by face, one group per part, so
 * the groups have to be rebuilt from the parts here. Reading them as face
 * groups instead drew the third part of a shape entirely with the top texture
 * and the fourth with the bottom, which is what put a pane's edge texture
 * across the whole of its east arm.
 */
function fuse(parts: THREE.BoxGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error("Could not build a block geometry");
  let offset = 0;
  for (const part of parts) {
    for (const group of part.groups) {
      merged.addGroup(offset + group.start, group.count, group.materialIndex ?? 0);
    }
    offset += part.index?.count ?? part.attributes["position"]!.count;
  }
  return merged;
}

/** Shared by every block layer; the per-block difference is only the material. */
export const BLOCK_GEOMETRY = boxPart([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]);

const SLAB_BOTTOM_GEOMETRY = boxPart([-0.5, -0.5, -0.5], [0.5, 0, 0.5]);
const SLAB_TOP_GEOMETRY = boxPart([-0.5, 0, -0.5], [0.5, 0.5, 0.5]);

/**
 * The boxes a stair is built from: the half-height part that spans the whole
 * cell, and one for each quarter of the other half that is filled.
 *
 * Which quarters those are comes from stairShape.ts, which reads the
 * neighbours, so a straight run gives two, an outer corner one and an inner
 * corner three. The boxes meet along internal faces, which are left in rather
 * than trimmed away: they sit inside the solid, so an outer face is always
 * nearer the camera and hides them.
 */
export function stairParts(
  quadrants: number,
  upsideDown: boolean,
): { min: [number, number, number]; max: [number, number, number] }[] {
  const flatLow = upsideDown ? 0 : -0.5;
  const stepLow = upsideDown ? -0.5 : 0;

  const parts: { min: [number, number, number]; max: [number, number, number] }[] = [
    { min: [-0.5, flatLow, -0.5], max: [0.5, flatLow + 0.5, 0.5] },
  ];

  for (let index = 0; index < QUADRANT_COUNT; index += 1) {
    if (!(quadrants & (1 << index))) continue;
    const [sx, sz] = quadrantSides(index);
    parts.push({
      min: [sx > 0 ? 0 : -0.5, stepLow, sz > 0 ? 0 : -0.5],
      max: [sx > 0 ? 0.5 : 0, stepLow + 0.5, sz > 0 ? 0.5 : 0],
    });
  }

  return parts;
}

/** One box of a shape, as two opposite corners inside the cell. */
interface Box {
  min: [number, number, number];
  max: [number, number, number];
  /** Turns the top and bottom texture a quarter. See boxPart. */
  turnEdges?: boolean;
}

/** A coordinate given in Minecraft's sixteenths of a block, as a cell offset. */
function px(sixteenths: number): number {
  return sixteenths / 16 - 0.5;
}

/**
 * A fence: a post, and two rails out to each side it joins. The sizes are
 * Minecraft's model, in sixteenths.
 */
export function fenceParts(mask: number): Box[] {
  const parts: Box[] = [{ min: [px(6), -0.5, px(6)], max: [px(10), 0.5, px(10)] }];
  for (const [low, high] of [
    [px(6), px(9)],
    [px(12), px(15)],
  ] as const) {
    if (mask & SIDE_NORTH) parts.push({ min: [px(7), low, -0.5], max: [px(9), high, px(6)] });
    if (mask & SIDE_SOUTH) parts.push({ min: [px(7), low, px(10)], max: [px(9), high, 0.5] });
    if (mask & SIDE_WEST) parts.push({ min: [-0.5, low, px(7)], max: [px(6), high, px(9)] });
    if (mask & SIDE_EAST) parts.push({ min: [px(10), low, px(7)], max: [0.5, high, px(9)] });
  }
  return parts;
}

/**
 * A wall: its post if it has one, and a side to each neighbour it joins. Each
 * side runs from the middle of the cell to its edge, so a straight run without
 * a post reads as one continuous wall.
 */
export function wallParts(variant: number): Box[] {
  const parts: Box[] = [];
  if (variant & WALL_POST_BIT) {
    parts.push({ min: [px(4), -0.5, px(4)], max: [px(12), 0.5, px(12)] });
  }
  const top = px(14);
  if (variant & SIDE_NORTH) parts.push({ min: [px(5), -0.5, -0.5], max: [px(11), top, 0] });
  if (variant & SIDE_SOUTH) parts.push({ min: [px(5), -0.5, 0], max: [px(11), top, 0.5] });
  if (variant & SIDE_WEST) parts.push({ min: [-0.5, -0.5, px(5)], max: [0, top, px(11)] });
  if (variant & SIDE_EAST) parts.push({ min: [0, -0.5, px(5)], max: [0.5, top, px(11)] });
  return parts;
}

/** A trapdoor: a thin panel across its half of the cell, or against its hinge when open. */
export function trapdoorParts(variant: number): Box[] {
  const thick = TRAPDOOR_THICKNESS;
  if (!(variant & TRAPDOOR_VARIANT_OPEN)) {
    return variant & TRAPDOOR_VARIANT_TOP
      ? [{ min: [-0.5, 0.5 - thick, -0.5], max: [0.5, 0.5, 0.5] }]
      : [{ min: [-0.5, -0.5, -0.5], max: [0.5, -0.5 + thick, 0.5] }];
  }

  // The hinge is on the side the trapdoor faces away from.
  const [fx, fz] = facingOffset(variant & 0b11);
  if (fz < 0) return [{ min: [-0.5, -0.5, 0.5 - thick], max: [0.5, 0.5, 0.5] }];
  if (fz > 0) return [{ min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, -0.5 + thick] }];
  if (fx < 0) return [{ min: [0.5 - thick, -0.5, -0.5], max: [0.5, 0.5, 0.5] }];
  return [{ min: [-0.5, -0.5, -0.5], max: [-0.5 + thick, 0.5, 0.5] }];
}

/**
 * A glass pane: its post and arms, standing a block tall. An arm reaching east
 * or west is the wider way round, so it takes its edge texture turned.
 */
export function paneParts(mask: number): Box[] {
  return paneRects(mask).map(([minX, maxX, minZ, maxZ]) => ({
    min: [minX, -0.5, minZ],
    max: [maxX, 0.5, maxZ],
    turnEdges: maxX - minX > maxZ - minZ,
  }));
}

/**
 * Built when first asked for and kept. Each shape has a few dozen variants at
 * most, and a build uses a handful of them.
 */
const partsCache = new Map<string, THREE.BufferGeometry>();

function cachedParts(key: string, parts: () => Box[]): THREE.BufferGeometry {
  const cached = partsCache.get(key);
  if (cached) return cached;
  const built = fuse(parts().map((part) => boxPart(part.min, part.max, part.turnEdges)));
  partsCache.set(key, built);
  return built;
}

/**
 * The geometry one render layer should be drawn with. `variant` is whatever
 * part of the shape is not in the shape number: a stair's filled quarters, the
 * sides a fence or wall joins, or a trapdoor's facing, half and whether it is
 * open. The other shapes ignore it.
 */
export function geometryForShape(shape: number, variant = 0): THREE.BufferGeometry {
  if (shape === SHAPE_SLAB_BOTTOM) return SLAB_BOTTOM_GEOMETRY;
  if (shape === SHAPE_SLAB_TOP) return SLAB_TOP_GEOMETRY;
  if (shape === SHAPE_STAIRS_BOTTOM) {
    return cachedParts(`stairs-${variant}`, () => stairParts(variant, false));
  }
  if (shape === SHAPE_STAIRS_TOP) {
    return cachedParts(`stairs-top-${variant}`, () => stairParts(variant, true));
  }
  if (shape === SHAPE_FENCE) return cachedParts(`fence-${variant}`, () => fenceParts(variant));
  if (shape === SHAPE_WALL) return cachedParts(`wall-${variant}`, () => wallParts(variant));
  if (shape === SHAPE_TRAPDOOR) return cachedParts(`trapdoor-${variant}`, () => trapdoorParts(variant));
  return BLOCK_GEOMETRY;
}

/**
 * The geometry for a render layer, allowing for blocks with a shape of their
 * own. A glass pane is a whole block by its shape number, so only its id says
 * to draw it as a pane.
 */
export function geometryForBlock(blockId: number, shape: number, variant = 0): THREE.BufferGeometry {
  if (PANE_BLOCK_IDS.has(blockId)) return cachedParts(`pane-${variant}`, () => paneParts(variant));
  return geometryForShape(shape, variant);
}

/**
 * Which way a block is turned, as a rotation of the shared cube.
 *
 * A log lying east to west is the same cube stood on its side, so orientation
 * costs nothing beyond the rotation already carried in each instance's matrix.
 */
const UPRIGHT = new THREE.Quaternion();
const LYING_EAST_WEST = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
const LYING_NORTH_SOUTH = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

export function rotationForAxis(axis: number): THREE.Quaternion {
  if (axis === AXIS_X) return LYING_EAST_WEST;
  if (axis === AXIS_Z) return LYING_NORTH_SOUTH;
  return UPRIGHT;
}
