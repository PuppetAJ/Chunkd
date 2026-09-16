/** A string rather than a packed number: the map is small and stays readable when logged. */
export type BlockKey = string;

export function toKey(x: number, y: number, z: number): BlockKey {
  return `${x},${y},${z}`;
}

export function fromKey(key: BlockKey): [number, number, number] {
  const parts = key.split(",");
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}
