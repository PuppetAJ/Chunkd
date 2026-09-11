import { SEE_THROUGH_BLOCK_IDS } from "./blockIds.ts";
import { blockIdOf, blockShapeOf, isFence, isWall, SHAPE_FULL } from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";

/**
 * Which sides a fence or a wall joins to, worked out from its neighbours.
 *
 * Derived rather than stored, like a stair's corners, so placing or breaking a
 * block beside one tidies it up with nothing to migrate.
 *
 * The rules are Minecraft's. Each joins its own kind and any whole solid block.
 * A fence and a wall do not join each other, and neither joins glass or leaves.
 */

export const SIDE_NORTH = 1;
export const SIDE_EAST = 2;
export const SIDE_SOUTH = 4;
export const SIDE_WEST = 8;

/** The step to each neighbour, in the order of the bits above. */
const SIDES: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** A wall's render variant carries its post in the bit above its sides. */
export const WALL_POST_BIT = 16;

function joins(neighbour: number | undefined, sameKind: (value: number) => boolean): boolean {
  if (neighbour === undefined) return false;
  if (sameKind(neighbour)) return true;
  return blockShapeOf(neighbour) === SHAPE_FULL && !SEE_THROUGH_BLOCK_IDS.has(blockIdOf(neighbour));
}

export function connectionMask(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
): number {
  const value = blocks.get(toKey(x, y, z));
  if (value === undefined) return 0;
  const sameKind = isFence(value) ? isFence : isWall(value) ? isWall : null;
  if (!sameKind) return 0;

  let mask = 0;
  for (let index = 0; index < SIDES.length; index += 1) {
    const [dx, dz] = SIDES[index]!;
    if (joins(blocks.get(toKey(x + dx, y, z + dz)), sameKind)) mask |= 1 << index;
  }
  return mask;
}

/**
 * Whether a wall stands a post in its middle.
 *
 * It does unless it runs straight through, joined on exactly two opposite
 * sides, or is a crossing joined on all four, which is the wiki's rule. A wall
 * stacked on top always gets one, so the column above has something to rest on.
 */
export function wallHasPost(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  mask: number,
): boolean {
  const above = blocks.get(toKey(x, y + 1, z));
  if (above !== undefined && isWall(above)) return true;
  const straight = mask === (SIDE_NORTH | SIDE_SOUTH) || mask === (SIDE_EAST | SIDE_WEST);
  const crossing = mask === (SIDE_NORTH | SIDE_EAST | SIDE_SOUTH | SIDE_WEST);
  return !(straight || crossing);
}
