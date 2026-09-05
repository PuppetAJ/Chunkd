/**
 * Block positions are integers, and they are used as Map keys.
 *
 * A string key is the simplest thing that works and keeps the store readable
 * when logged. Packing three coordinates into a single number would be faster
 * but the map is only a few thousand entries, so it is not worth the loss in
 * legibility.
 */
export type BlockKey = string;

export function toKey(x: number, y: number, z: number): BlockKey {
  return `${x},${y},${z}`;
}

export function fromKey(key: BlockKey): [number, number, number] {
  const parts = key.split(",");
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}
