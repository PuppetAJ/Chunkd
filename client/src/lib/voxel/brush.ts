/** Odd sizes only, so the crosshair has a middle cell. */
export const BRUSH_SIZES = [1, 3, 5, 7, 9];

/** One cell of the world, as x, y and z. */
export type Cell = [number, number, number];

/** The next size up, or down for a negative direction, stopping at each end. */
export function nextBrush(size: number, direction: number): number {
  const index = BRUSH_SIZES.indexOf(size);
  const next = (index === -1 ? 0 : index) + direction;
  return BRUSH_SIZES[Math.min(Math.max(next, 0), BRUSH_SIZES.length - 1)] ?? 1;
}

/** The cells a brush covers, centred on one cell and flat against the face with this normal. */
export function brushCells(
  x: number,
  y: number,
  z: number,
  normalX: number,
  normalY: number,
  normalZ: number,
  size: number,
): Cell[] {
  const reach = Math.floor(size / 2);
  const cells: Cell[] = [];
  for (let a = -reach; a <= reach; a += 1) {
    for (let b = -reach; b <= reach; b += 1) {
      if (Math.abs(normalY) > 0.5) cells.push([x + a, y, z + b]);
      else if (Math.abs(normalX) > 0.5) cells.push([x, y + a, z + b]);
      else cells.push([x + a, y + b, z]);
    }
  }
  return cells;
}
