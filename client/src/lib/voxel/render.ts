import { SEE_THROUGH_BLOCK_IDS } from "./blockIds.ts";
import {
  blockAxisOf,
  blockIdOf,
  blockShapeOf,
  SHAPE_FENCE,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
  trapdoorVariant,
} from "./blockValue.ts";
import { connectionMask, isPane, WALL_POST_BIT, wallHasPost } from "./connectionShape.ts";
import { stairQuadrants } from "./stairShape.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

export interface RenderLayer {
  blockId: number;
  /** Whole block, slab or stairs. One mesh is one id, shape and facing. */
  shape: number;
  /**
   * The part of the shape that is not in the shape number: for stairs the
   * quarters the tall half fills, for fences and walls the sides they join,
   * for a trapdoor its facing, half and whether it is open.
   */
  variant: number;
  /** Flat x, y, z triples. */
  positions: Float32Array;
  /** Which way each of those blocks is turned, one entry per position. */
  axes: Uint8Array;
}

/**
 * The blocks that actually need drawing: a block boxed in on all six sides
 * cannot be seen, and on a solid landscape that is most of the world.
 *
 * Kept as its own map and updated around each edit rather than worked out on
 * demand, which costs six questions about every block in the world.
 */
export type VisibleBlocks = Map<BlockKey, number>;

/**
 * Does the block in this cell cover the whole of the face it shares with the
 * neighbour that is asking? `dy` is the vertical step from that neighbour, so
 * for +1 this block is above and the shared face is its underside.
 *
 * Glass never counts, and a cut block covers only one of its six faces. Half
 * covered is not covered: treating it as whole leaves holes in the world.
 */
function coversFace(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  dy: number,
): boolean {
  const value = blocks.get(toKey(x, y, z));
  if (value === undefined) return false;
  if (SEE_THROUGH_BLOCK_IDS.has(blockIdOf(value))) return false;

  const shape = blockShapeOf(value);
  if (shape === SHAPE_FULL) return true;
  if (shape === SHAPE_SLAB_BOTTOM) return dy === 1;
  if (shape === SHAPE_SLAB_TOP) return dy === -1;

  // A stair's flat half fills the footprint, so its outer face is whole. Its
  // sides are never counted, even where they are solid: how much of the tall
  // half is filled depends on that stair's own neighbours, so the answer would
  // depend on cells two away, which the update after an edit does not visit.
  if (shape === SHAPE_STAIRS_BOTTOM) return dy === 1;
  if (shape === SHAPE_STAIRS_TOP) return dy === -1;

  // None of these hides a neighbour. Fences and walls fill no face of their
  // cell, and the one a shut trapdoor fills is full of holes you can see
  // through. Left to the line below, each would have cut a hole in the world.
  if (shape === SHAPE_FENCE || shape === SHAPE_WALL || shape === SHAPE_TRAPDOOR) return false;

  return true;
}

function isHidden(blocks: Map<BlockKey, number>, x: number, y: number, z: number): boolean {
  // A slab's exposed surface is inside its own cell, where no neighbour can
  // reach it, so a slab is never hidden.
  const self = blocks.get(toKey(x, y, z));
  if (self !== undefined && blockShapeOf(self) !== SHAPE_FULL) return false;

  return (
    coversFace(blocks, x + 1, y, z, 0) &&
    coversFace(blocks, x - 1, y, z, 0) &&
    coversFace(blocks, x, y + 1, z, 1) &&
    coversFace(blocks, x, y - 1, z, -1) &&
    coversFace(blocks, x, y, z + 1, 0) &&
    coversFace(blocks, x, y, z - 1, 0)
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

/** Only used to combine an id, a shape and a variant into one map key. */
const SHAPE_SLOTS = 8;
const VARIANT_SLOTS = 32;

/** The part of a block's shape that comes from its neighbours or its state. */
export function variantFor(
  blocks: Map<BlockKey, number>,
  value: number,
  x: number,
  y: number,
  z: number,
): number {
  if (isPane(value)) return connectionMask(blocks, x, y, z);
  const shape = blockShapeOf(value);
  if (shape === SHAPE_STAIRS_BOTTOM || shape === SHAPE_STAIRS_TOP) {
    return stairQuadrants(blocks, x, y, z);
  }
  if (shape === SHAPE_FENCE) return connectionMask(blocks, x, y, z);
  if (shape === SHAPE_WALL) {
    const mask = connectionMask(blocks, x, y, z);
    return mask | (wallHasPost(blocks, x, y, z, mask) ? WALL_POST_BIT : 0);
  }
  if (shape === SHAPE_TRAPDOOR) return trapdoorVariant(value);
  return 0;
}

/**
 * Group the visible blocks by id, shape and variant, one instanced mesh each.
 * A stair's shape is baked into its geometry rather than rotated per instance,
 * so its faces keep the brightness and texture of the way they point.
 *
 * `blocks` is the whole world because a stair's shape depends on its
 * neighbours. This runs on every edit, so corners correct themselves.
 */
export function groupVisible(
  visible: VisibleBlocks,
  blocks: Map<BlockKey, number> = visible,
): RenderLayer[] {
  const positionsByType = new Map<number, number[]>();
  const axesByType = new Map<number, number[]>();

  for (const [key, value] of visible) {
    const [x, y, z] = fromKey(key);
    const shape = blockShapeOf(value);
    const variant = variantFor(blocks, value, x, y, z);
    const type = (blockIdOf(value) * SHAPE_SLOTS + shape) * VARIANT_SLOTS + variant;
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
      blockId: Math.floor(type / (SHAPE_SLOTS * VARIANT_SLOTS)),
      shape: Math.floor(type / VARIANT_SLOTS) % SHAPE_SLOTS,
      variant: type % VARIANT_SLOTS,
      positions: new Float32Array(positionsByType.get(type)!),
      axes: Uint8Array.from(axesByType.get(type)!),
    }));
}

/** The whole job in one step. Convenient for tests and for the build viewer. */
export function buildRenderLayers(blocks: Map<BlockKey, number>): RenderLayer[] {
  return groupVisible(computeVisible(blocks), blocks);
}
