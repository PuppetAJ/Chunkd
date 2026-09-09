import { SEE_THROUGH_BLOCK_IDS } from "./blockIds.ts";
import { blockAxisOf, blockIdOf, blockShapeOf, SHAPE_FULL, SHAPE_SLAB_BOTTOM, SHAPE_SLAB_TOP } from "./blockValue.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

export interface RenderLayer {
  blockId: number;
  /** Full cube, bottom slab or top slab. One mesh is one id and one shape. */
  shape: number;
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
 * `dy` is the step from the asking block to this one: +1 for the cell above,
 * -1 below, 0 for the four sides.
 *
 * Glass never counts. Nor does most of a slab: it fills exactly one of its
 * cell's six faces, a bottom slab's underside or a top slab's top, and half
 * covered is not covered. Treating one as a full occluder leaves see-through
 * holes wherever a slab floor meets terrain.
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
  // The neighbour is above, so the face they share is this slab's underside.
  if (shape === SHAPE_SLAB_BOTTOM) return dy === 1;
  if (shape === SHAPE_SLAB_TOP) return dy === -1;
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

/** Only used to combine an id and a shape into one map key. */
const SHAPE_SLOTS = 8;

/**
 * Group the visible blocks by id and shape, ready for one instanced mesh each.
 * By shape as well as id, because every instance in a mesh shares a geometry.
 */
export function groupVisible(visible: VisibleBlocks): RenderLayer[] {
  const positionsByType = new Map<number, number[]>();
  const axesByType = new Map<number, number[]>();

  for (const [key, value] of visible) {
    const [x, y, z] = fromKey(key);
    const type = blockIdOf(value) * SHAPE_SLOTS + blockShapeOf(value);
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
      blockId: Math.floor(type / SHAPE_SLOTS),
      shape: type % SHAPE_SLOTS,
      positions: new Float32Array(positionsByType.get(type)!),
      axes: Uint8Array.from(axesByType.get(type)!),
    }));
}

/** The whole job in one step. Convenient for tests and for the build viewer. */
export function buildRenderLayers(blocks: Map<BlockKey, number>): RenderLayer[] {
  return groupVisible(computeVisible(blocks));
}
