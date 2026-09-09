import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  AXIS_X,
  AXIS_Z,
  FACING_EAST,
  FACING_NORTH,
  FACING_SOUTH,
  FACING_WEST,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
} from "./voxel/blockValue.ts";

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
 */
function boxPart(min: [number, number, number], max: [number, number, number]): THREE.BoxGeometry {
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
      u = x + 0.5;
      v = (ny > 0 ? z : -z) + 0.5;
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
 * Join parts into one geometry, keeping BoxGeometry's material groups.
 *
 * Each part contributes six groups, so their material indices are brought back
 * into the range 0 to 5 and BlockLayer's six-entry material array keeps
 * working: index 2 is still the top texture, 3 the bottom, the rest the sides.
 */
function fuse(parts: THREE.BoxGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, true);
  if (!merged) throw new Error("Could not build a block geometry");
  for (let i = 0; i < merged.groups.length; i += 1) {
    merged.groups[i]!.materialIndex = i % 6;
  }
  return merged;
}

/** Shared by every block layer; the per-block difference is only the material. */
export const BLOCK_GEOMETRY = boxPart([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]);

const SLAB_BOTTOM_GEOMETRY = boxPart([-0.5, -0.5, -0.5], [0.5, 0, 0.5]);
const SLAB_TOP_GEOMETRY = boxPart([-0.5, 0, -0.5], [0.5, 0.5, 0.5]);

/**
 * The two boxes a stair is built from: the half-height part that spans the
 * whole cell, and the part that makes up the step.
 *
 * Facing is the direction the low step faces, so the tall part is on the
 * opposite side. The boxes meet along an internal face, which is left in
 * rather than trimmed away: it sits inside the solid, so an outer face is
 * always nearer the camera and hides it.
 *
 * Exported because this is the part worth checking. Whether the boxes are in
 * the right places is a decision with four cases and an upside-down variant;
 * turning boxes into vertices is not.
 */
export function stairParts(
  facing: number,
  upsideDown: boolean,
): { min: [number, number, number]; max: [number, number, number] }[] {
  const tall =
    facing === FACING_EAST
      ? { min: [-0.5, -0.5], max: [0, 0.5] }
      : facing === FACING_WEST
        ? { min: [0, -0.5], max: [0.5, 0.5] }
        : facing === FACING_SOUTH
          ? { min: [-0.5, -0.5], max: [0.5, 0] }
          : { min: [-0.5, 0], max: [0.5, 0.5] };

  const flatLow = upsideDown ? 0 : -0.5;
  const stepLow = upsideDown ? -0.5 : 0;
  return [
    { min: [-0.5, flatLow, -0.5], max: [0.5, flatLow + 0.5, 0.5] },
    {
      min: [tall.min[0]!, stepLow, tall.min[1]!],
      max: [tall.max[0]!, stepLow + 0.5, tall.max[1]!],
    },
  ];
}

function stairsGeometry(facing: number, upsideDown: boolean): THREE.BufferGeometry {
  return fuse(stairParts(facing, upsideDown).map((part) => boxPart(part.min, part.max)));
}

const FACINGS = [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST];
const STAIRS_BOTTOM_GEOMETRIES = FACINGS.map((facing) => stairsGeometry(facing, false));
const STAIRS_TOP_GEOMETRIES = FACINGS.map((facing) => stairsGeometry(facing, true));

/** The geometry one render layer should be drawn with. */
export function geometryForShape(shape: number, facing = FACING_NORTH): THREE.BufferGeometry {
  if (shape === SHAPE_SLAB_BOTTOM) return SLAB_BOTTOM_GEOMETRY;
  if (shape === SHAPE_SLAB_TOP) return SLAB_TOP_GEOMETRY;
  if (shape === SHAPE_STAIRS_BOTTOM) return STAIRS_BOTTOM_GEOMETRIES[facing] ?? BLOCK_GEOMETRY;
  if (shape === SHAPE_STAIRS_TOP) return STAIRS_TOP_GEOMETRIES[facing] ?? BLOCK_GEOMETRY;
  return BLOCK_GEOMETRY;
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
