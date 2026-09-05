import { fromKey, toKey, type BlockKey } from "./coords.ts";

export interface RenderLayer {
  blockId: number;
  /** Flat x, y, z triples. */
  positions: Float32Array;
}

/**
 * Work out which blocks actually need drawing, grouped by type.
 *
 * A block with all six neighbours present cannot be seen from anywhere, so it
 * is skipped. On a solid landscape that is most of the world, and it is the
 * difference between the cost of rendering scaling with the world's volume and
 * scaling with its surface.
 */
export function buildRenderLayers(blocks: Map<BlockKey, number>): RenderLayer[] {
  const byType = new Map<number, number[]>();

  for (const [key, id] of blocks) {
    const [x, y, z] = fromKey(key);
    if (
      blocks.has(toKey(x + 1, y, z)) &&
      blocks.has(toKey(x - 1, y, z)) &&
      blocks.has(toKey(x, y + 1, z)) &&
      blocks.has(toKey(x, y - 1, z)) &&
      blocks.has(toKey(x, y, z + 1)) &&
      blocks.has(toKey(x, y, z - 1))
    ) {
      continue;
    }
    let list = byType.get(id);
    if (!list) {
      list = [];
      byType.set(id, list);
    }
    list.push(x, y, z);
  }

  // Sorted by id so layer order is stable between edits, which keeps React
  // from tearing down and rebuilding instanced meshes on every block placed.
  return [...byType.keys()]
    .sort((a, b) => a - b)
    .map((blockId) => ({
      blockId,
      positions: new Float32Array(byType.get(blockId)!),
    }));
}
