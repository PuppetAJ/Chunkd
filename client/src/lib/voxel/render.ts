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
 * Work out which blocks actually need drawing, grouped by type.
 *
 * A block boxed in on all six sides by opaque neighbours cannot be seen from
 * anywhere, so it is skipped. On a solid landscape that is most of the world,
 * and it is the difference between the cost of rendering scaling with the
 * world's volume and scaling with its surface.
 *
 * Glass does not count as a neighbour here, because you can see the block
 * behind it.
 */
export function buildRenderLayers(blocks: Map<BlockKey, number>): RenderLayer[] {
  const positionsByType = new Map<number, number[]>();
  const axesByType = new Map<number, number[]>();

  const hidesWhatIsBehindIt = (x: number, y: number, z: number): boolean => {
    const neighbour = blocks.get(toKey(x, y, z));
    return neighbour !== undefined && !SEE_THROUGH_BLOCK_IDS.has(blockIdOf(neighbour));
  };

  for (const [key, value] of blocks) {
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
