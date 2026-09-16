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
 * Face brightness, baked in as vertex colours because a shadow map stripes
 * axis-aligned ground under a low sun. Linear space: the familiar 1, 0.8, 0.6
 * and 0.5 are on-screen values, so these are raised for gamma and for the sun shading on top.
 */
const FACE_BRIGHTNESS = {
  top: 1,
  bottom: 0.42,
  northSouth: 0.74,
  /** Darker than northSouth so adjacent sides differ. */
  eastWest: 0.55,
};

/**
 * One box of a block, textured as though the texture were projected through the
 * cell. The offset is baked into the geometry so every instance sits at the
 * centre of its cell. `turnEdges` turns the top and bottom texture a quarter, for a pane's east-west arm.
 */
function boxPart(
  min: [number, number, number],
  max: [number, number, number],
  turnEdges = false,
): THREE.BufferGeometry {
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

    // The signs match BoxGeometry's own uv layout for a whole cube.
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

  // BoxGeometry's face order is +X, -X, +Y, -Y, +Z, -Z.
  for (const group of geometry.groups) {
    group.materialIndex =
      group.materialIndex === 2 ? MATERIAL_TOP : group.materialIndex === 3 ? MATERIAL_BOTTOM : MATERIAL_SIDE;
  }
  return oneGroupPerMaterial(geometry);
}

/** BlockLayer builds its material list in this order. */
export const MATERIAL_SIDE = 0;
export const MATERIAL_TOP = 1;
export const MATERIAL_BOTTOM = 2;
const MATERIAL_COUNT = 3;

/** Reorder the faces so each material is one group, and so one draw call. */
function oneGroupPerMaterial(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = geometry.index;
  if (!index) throw new Error("A block geometry must be indexed");

  const sorted: number[] = [];
  const runs: { start: number; count: number; material: number }[] = [];
  for (let material = 0; material < MATERIAL_COUNT; material += 1) {
    const start = sorted.length;
    for (const group of geometry.groups) {
      if (group.materialIndex !== material) continue;
      for (let i = group.start; i < group.start + group.count; i += 1) sorted.push(index.getX(i));
    }
    if (sorted.length > start) runs.push({ start, count: sorted.length - start, material });
  }

  geometry.setIndex(sorted);
  geometry.clearGroups();
  for (const run of runs) geometry.addGroup(run.start, run.count, run.material);
  return geometry;
}

/** Join parts keeping faces grouped by material; mergeGeometries alone makes one group per part. */
function fuse(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error("Could not build a block geometry");
  let offset = 0;
  for (const part of parts) {
    for (const group of part.groups) {
      merged.addGroup(offset + group.start, group.count, group.materialIndex ?? 0);
    }
    offset += part.index?.count ?? part.attributes["position"]!.count;
  }
  return oneGroupPerMaterial(merged);
}

/** Shared by every block layer; the per-block difference is only the material. */
export const BLOCK_GEOMETRY = boxPart([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]);

const SLAB_BOTTOM_GEOMETRY = boxPart([-0.5, -0.5, -0.5], [0.5, 0, 0.5]);
const SLAB_TOP_GEOMETRY = boxPart([-0.5, 0, -0.5], [0.5, 0.5, 0.5]);

/** The half-height part spanning the cell, then one box per filled quarter of the other half. */
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

/** A fence: a post and two rails to each side it joins. Sizes are Minecraft's, in sixteenths. */
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

/** A wall: its post if it has one, and a side from the middle of the cell to each neighbour it joins. */
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

/** A glass pane: its post and arms. An arm reaching east or west takes its edge texture turned. */
export function paneParts(mask: number): Box[] {
  return paneRects(mask).map(([minX, maxX, minZ, maxZ]) => ({
    min: [minX, -0.5, minZ],
    max: [maxX, 0.5, maxZ],
    turnEdges: maxX - minX > maxZ - minZ,
  }));
}

const partsCache = new Map<string, THREE.BufferGeometry>();

function cachedParts(key: string, parts: () => Box[]): THREE.BufferGeometry {
  const cached = partsCache.get(key);
  if (cached) return cached;
  const built = fuse(parts().map((part) => boxPart(part.min, part.max, part.turnEdges)));
  partsCache.set(key, built);
  return built;
}

/** `variant` is the shape's extra bits: stair quarters, fence or wall sides, trapdoor facing and half. */
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

/** A glass pane is a whole block by shape number; only its id says to draw it as a pane. */
export function geometryForBlock(blockId: number, shape: number, variant = 0): THREE.BufferGeometry {
  if (PANE_BLOCK_IDS.has(blockId)) return cachedParts(`pane-${variant}`, () => paneParts(variant));
  return geometryForShape(shape, variant);
}

/** A log on its side is the same cube rotated. */
const UPRIGHT = new THREE.Quaternion();
const LYING_EAST_WEST = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
const LYING_NORTH_SOUTH = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

export function rotationForAxis(axis: number): THREE.Quaternion {
  if (axis === AXIS_X) return LYING_EAST_WEST;
  if (axis === AXIS_Z) return LYING_NORTH_SOUTH;
  return UPRIGHT;
}
