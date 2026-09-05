import { SEE_THROUGH_BLOCK_IDS } from "./blockIds.ts";
import { blockAxisOf, blockIdOf } from "./blockValue.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

export interface RenderLayer {
  blockId: number;
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

/** Glass does not hide what is behind it, so it never counts as an occluder. */
function isOpaqueAt(blocks: Map<BlockKey, number>, x: number, y: number, z: number): boolean {
  const value = blocks.get(toKey(x, y, z));
  return value !== undefined && !SEE_THROUGH_BLOCK_IDS.has(blockIdOf(value));
}

function isHidden(blocks: Map<BlockKey, number>, x: number, y: number, z: number): boolean {
  return (
    isOpaqueAt(blocks, x + 1, y, z) &&
    isOpaqueAt(blocks, x - 1, y, z) &&
    isOpaqueAt(blocks, x, y + 1, z) &&
    isOpaqueAt(blocks, x, y - 1, z) &&
    isOpaqueAt(blocks, x, y, z + 1) &&
    isOpaqueAt(blocks, x, y, z - 1)
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

/** Group the visible blocks by type, ready for one instanced mesh each. */
export function groupVisible(visible: VisibleBlocks): RenderLayer[] {
  const positionsByType = new Map<number, number[]>();
  const axesByType = new Map<number, number[]>();

  for (const [key, value] of visible) {
    const [x, y, z] = fromKey(key);
    const id = blockIdOf(value);
    let positions = positionsByType.get(id);
    let axes = axesByType.get(id);
    if (!positions || !axes) {
      positions = [];
      axes = [];
      positionsByType.set(id, positions);
      axesByType.set(id, axes);
    }
    positions.push(x, y, z);
    axes.push(blockAxisOf(value));
  }

  // Sorted by id so layer order is stable between edits, which keeps React
  // from tearing down and rebuilding instanced meshes on every block placed.
  return [...positionsByType.keys()]
    .sort((a, b) => a - b)
    .map((blockId) => ({
      blockId,
      positions: new Float32Array(positionsByType.get(blockId)!),
      axes: Uint8Array.from(axesByType.get(blockId)!),
    }));
}

/** The whole job in one step. Convenient for tests and for the build viewer. */
export function buildRenderLayers(blocks: Map<BlockKey, number>): RenderLayer[] {
  return groupVisible(computeVisible(blocks));
}
