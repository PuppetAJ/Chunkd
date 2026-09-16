import { blockFacingOf, facingOffset, isStairs, isUpsideDown } from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";

/**
 * How much of a stair's tall half is filled, derived from its neighbours so two
 * meeting at right angles form a corner: two quarters straight, one for an
 * outer corner, three for an inner one.
 */

/** One quarter of the cell, by which side of the middle it sits on. */
function quadrantBit(sx: number, sz: number): number {
  return 1 << ((sx > 0 ? 1 : 0) + (sz > 0 ? 2 : 0));
}

/** The x and z halves a quarter covers, as -1 or 1 on each axis. */
export function quadrantSides(index: number): [number, number] {
  return [index & 1 ? 1 : -1, index & 2 ? 1 : -1];
}

export const QUADRANT_COUNT = 4;

/** The direction a stair's tall half lies in, which is opposite its facing. */
function tallDirection(facing: number): [number, number] {
  const [fx, fz] = facingOffset(facing);
  return [fx === 0 ? 0 : -fx, fz === 0 ? 0 : -fz];
}

/** The two quarters a plain straight stair fills. */
export function straightQuadrants(facing: number): number {
  const [tx, tz] = tallDirection(facing);
  if (tx !== 0) return quadrantBit(tx, -1) | quadrantBit(tx, 1);
  return quadrantBit(-1, tz) | quadrantBit(1, tz);
}

/** A neighbouring stair in the same half, lying across this one. One in line continues it instead. */
function turningNeighbour(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  upsideDown: boolean,
  facing: number,
): [number, number] | null {
  const value = blocks.get(toKey(x, y, z));
  if (value === undefined || !isStairs(value)) return null;
  if (isUpsideDown(value) !== upsideDown) return null;

  const [tx] = tallDirection(facing);
  const [nx, nz] = tallDirection(blockFacingOf(value));
  // Across, not along: the neighbour's tall half runs on the other axis.
  if ((tx !== 0) === (nx !== 0)) return null;
  return [nx, nz];
}

export function stairQuadrants(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
): number {
  const value = blocks.get(toKey(x, y, z));
  if (value === undefined || !isStairs(value)) return 0;

  const facing = blockFacingOf(value);
  const upsideDown = isUpsideDown(value);
  const [tx, tz] = tallDirection(facing);
  const [fx, fz] = facingOffset(facing);
  const straight = straightQuadrants(facing);

  // A turn against the tall side leaves one quarter, on the outside.
  const behind = turningNeighbour(blocks, x + tx, y, z + tz, upsideDown, facing);
  if (behind) {
    const [nx, nz] = behind;
    return tx !== 0 ? quadrantBit(tx, nz) : quadrantBit(nx, tz);
  }

  // One against the low side adds a third quarter, on the inside.
  const infront = turningNeighbour(blocks, x + fx, y, z + fz, upsideDown, facing);
  if (infront) {
    const [nx, nz] = infront;
    return straight | (tx !== 0 ? quadrantBit(-tx, nz) : quadrantBit(nx, -tz));
  }

  return straight;
}
