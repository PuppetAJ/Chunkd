import { SEE_THROUGH_BLOCK_IDS } from "./blockIds.ts";
import {
  blockAxisOf,
  blockFacingOf,
  blockIdOf,
  blockShapeOf,
  facingOffset,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
} from "./blockValue.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

export interface RenderLayer {
  blockId: number;
  /** Whole block, slab or stairs. One mesh is one id, shape and facing. */
  shape: number;
  /** Only meaningful for stairs, the one shape that differs by side. */
  facing: number;
  /** Flat x, y, z triples. */
  positions: Float32Array;
  /** Which way each of those blocks is turned, one entry per position. */
  axes: Uint8Array;
}

/**
 * The blocks that actually need drawing.
 *
 * A block boxed in on all six sides by opaque neighbours cannot be seen from
 * anywhere. On a solid landscape that is most of the world, and skipping them is
 * the difference between the cost of rendering scaling with the world's volume
 * and scaling with its surface.
 *
 * This is kept as its own map rather than recomputed from the world on demand,
 * because working it out from scratch means asking six questions about every
 * block in the world. That was around 23 ms once the terrain grew taller, so
 * every block placed cost a dropped frame. Placing a block can only change
 * whether that block and its six neighbours are visible, so the map is brought
 * up to date around the change instead.
 */
export type VisibleBlocks = Map<BlockKey, number>;

/**
 * Does the block in this cell cover the whole of the face it shares with the
 * neighbour that is asking?
 *
 * `d` is the step from the asking block to this one, so the face they share is
 * this block's face pointing back along it: for `dy` of +1 this block is above
 * and the shared face is its underside.
 *
 * Glass never counts. Nor does most of a cut block. A slab fills exactly one
 * of its cell's six faces, its underside or its top, and half covered is not
 * covered. A stair fills two: the same one, and the whole side away from its
 * facing, where its tall half reaches the full height. Treating either as a
 * full occluder leaves see-through holes where a cut floor meets terrain.
 */
function coversFace(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
): boolean {
  const value = blocks.get(toKey(x, y, z));
  if (value === undefined) return false;
  if (SEE_THROUGH_BLOCK_IDS.has(blockIdOf(value))) return false;

  const shape = blockShapeOf(value);
  if (shape === SHAPE_FULL) return true;
  if (shape === SHAPE_SLAB_BOTTOM) return dy === 1;
  if (shape === SHAPE_SLAB_TOP) return dy === -1;

  if (shape === SHAPE_STAIRS_BOTTOM || shape === SHAPE_STAIRS_TOP) {
    // The flat half fills the cell's footprint, so its outer face is whole.
    if (shape === SHAPE_STAIRS_BOTTOM && dy === 1) return true;
    if (shape === SHAPE_STAIRS_TOP && dy === -1) return true;
    if (dy !== 0) return false;
    // Sideways, the whole face is the one the tall half backs onto. That is
    // the side this block's own facing points at from the asker's position.
    const [fx, fz] = facingOffset(blockFacingOf(value));
    return dx === fx && dz === fz;
  }

  return true;
}

function isHidden(blocks: Map<BlockKey, number>, x: number, y: number, z: number): boolean {
  // A slab's exposed surface is inside its own cell, where no neighbour can
  // reach it, so a slab is never hidden.
  const self = blocks.get(toKey(x, y, z));
  if (self !== undefined && blockShapeOf(self) !== SHAPE_FULL) return false;

  return (
    coversFace(blocks, x + 1, y, z, 1, 0, 0) &&
    coversFace(blocks, x - 1, y, z, -1, 0, 0) &&
    coversFace(blocks, x, y + 1, z, 0, 1, 0) &&
    coversFace(blocks, x, y - 1, z, 0, -1, 0) &&
    coversFace(blocks, x, y, z + 1, 0, 0, 1) &&
    coversFace(blocks, x, y, z - 1, 0, 0, -1)
  );
}

/** Work the whole thing out from scratch. Used when a world is first built. */
export function computeVisible(blocks: Map<BlockKey, number>): VisibleBlocks {
  const visible: VisibleBlocks = new Map();
  for (const [key, value] of blocks) {
    const [x, y, z] = fromKey(key);
    if (!isHidden(blocks, x, y, z)) visible.set(key, value);
  }
  return visible;
}

/**
 * Bring the visible set up to date after one cell changed.
 *
 * The cell itself and its six neighbours are the only blocks whose visibility
 * the change can affect, so those are the only ones re-examined.
 */
export function refreshVisibleAround(
  blocks: Map<BlockKey, number>,
  visible: VisibleBlocks,
  x: number,
  y: number,
  z: number,
): void {
  const cells: [number, number, number][] = [
    [x, y, z],
    [x + 1, y, z],
    [x - 1, y, z],
    [x, y + 1, z],
    [x, y - 1, z],
    [x, y, z + 1],
    [x, y, z - 1],
  ];

  for (const [cx, cy, cz] of cells) {
    const key = toKey(cx, cy, cz);
    const value = blocks.get(key);
    if (value === undefined || isHidden(blocks, cx, cy, cz)) visible.delete(key);
    else visible.set(key, value);
  }
}

/** Only used to combine an id, a shape and a facing into one map key. */
const SHAPE_SLOTS = 8;
const FACING_SLOTS = 4;

/**
 * Group the visible blocks by id, shape and facing, ready for one instanced
 * mesh each. Every instance in a mesh shares a geometry, and a stair's facing
 * is baked into its geometry rather than rotated per instance, so that its
 * faces keep the brightness and the texture of the way they actually point.
 */
export function groupVisible(visible: VisibleBlocks): RenderLayer[] {
  const positionsByType = new Map<number, number[]>();
  const axesByType = new Map<number, number[]>();

  for (const [key, value] of visible) {
    const [x, y, z] = fromKey(key);
    const type =
      (blockIdOf(value) * SHAPE_SLOTS + blockShapeOf(value)) * FACING_SLOTS +
      blockFacingOf(value);
    let positions = positionsByType.get(type);
    let axes = axesByType.get(type);
    if (!positions || !axes) {
      positions = [];
      axes = [];
      positionsByType.set(type, positions);
      axesByType.set(type, axes);
    }
    positions.push(x, y, z);
    axes.push(blockAxisOf(value));
  }

  // Sorted so layer order is stable between edits, which keeps React from
  // tearing down and rebuilding instanced meshes on every block placed.
  return [...positionsByType.keys()]
    .sort((a, b) => a - b)
    .map((type) => ({
      blockId: Math.floor(type / (SHAPE_SLOTS * FACING_SLOTS)),
      shape: Math.floor(type / FACING_SLOTS) % SHAPE_SLOTS,
      facing: type % FACING_SLOTS,
      positions: new Float32Array(positionsByType.get(type)!),
      axes: Uint8Array.from(axesByType.get(type)!),
    }));
}

/** The whole job in one step. Convenient for tests and for the build viewer. */
export function buildRenderLayers(blocks: Map<BlockKey, number>): RenderLayer[] {
  return groupVisible(computeVisible(blocks));
}
