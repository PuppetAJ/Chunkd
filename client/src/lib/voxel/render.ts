import { SEE_THROUGH_BLOCK_IDS } from "./blockIds.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

export interface RenderLayer {
  blockId: number;
  /** Flat x, y, z triples. */
  positions: Float32Array;
}

/**
 * Work out which blocks actually need drawing, grouped by type.
 *
 * A block boxed in on all six sides by opaque neighbours cannot be seen from
 * anywhere, so it is skipped. On a solid landscape that is most of the world,
 * and it is the difference between the cost of rendering scaling with the
 * world's volume and scaling with its surface.
 *
 * Glass and leaves do not count as neighbours here, because you can see the
 * block behind them.
 */
export function buildRenderLayers(blocks: Map<BlockKey, number>): RenderLayer[] {
  const byType = new Map<number, number[]>();

  const hidesWhatIsBehindIt = (x: number, y: number, z: number): boolean => {
    const neighbour = blocks.get(toKey(x, y, z));
    return neighbour !== undefined && !SEE_THROUGH_BLOCK_IDS.has(neighbour);
  };

  for (const [key, id] of blocks) {
    const [x, y, z] = fromKey(key);
    if (
      hidesWhatIsBehindIt(x + 1, y, z) &&
      hidesWhatIsBehindIt(x - 1, y, z) &&
      hidesWhatIsBehindIt(x, y + 1, z) &&
      hidesWhatIsBehindIt(x, y - 1, z) &&
      hidesWhatIsBehindIt(x, y, z + 1) &&
      hidesWhatIsBehindIt(x, y, z - 1)
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
