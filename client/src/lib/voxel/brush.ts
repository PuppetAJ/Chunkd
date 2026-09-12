/**
 * How many cells one break or place covers.
 *
 * Clearing ground or raising a wall a block at a time is the slowest part of
 * building anything large, so an action can cover a square instead. The square
 * lies in the face being looked at: at the ground it spreads across the floor,
 * at a wall it spreads up the wall, which is what makes it useful for both
 * levelling and building.
 *
 * Only odd sizes, so there is always a middle cell for the crosshair to be on.
 */
export const BRUSH_SIZES = [1, 3, 5, 7, 9];

/** One cell of the world, as x, y and z. */
export type Cell = [number, number, number];

/** The next size up, or down for a negative direction, stopping at each end. */
export function nextBrush(size: number, direction: number): number {
  const index = BRUSH_SIZES.indexOf(size);
  const next = (index === -1 ? 0 : index) + direction;
  return BRUSH_SIZES[Math.min(Math.max(next, 0), BRUSH_SIZES.length - 1)] ?? 1;
}

/**
 * The cells a brush of this size covers, centred on one cell and lying flat
 * against the face whose normal is given. A size of 1 is just that cell, so
 * the caller needs no special case for the ordinary brush.
 */
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
