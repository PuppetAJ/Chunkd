import { BLOCK_IDS, PANE_BLOCK_IDS, SEE_THROUGH_BLOCK_IDS } from "./blockIds.ts";
import { blockIdOf, blockShapeOf, isFence, isStairs, isWall, SHAPE_FULL } from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { QUADRANT_COUNT, quadrantSides, stairQuadrants } from "./stairShape.ts";

/**
 * Which sides a fence, a wall or a glass pane joins to, from its neighbours.
 * Derived rather than stored, like a stair's corners, so breaking a block
 * beside one tidies it up with nothing to migrate.
 *
 * The rules are Minecraft's: each joins its own kind and any whole solid block,
 * glass included. Walls and panes join each other, and a pane joins the solid
 * back of a stair. Nothing joins leaves, and a fence joins only fences.
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

/** A glass pane is its own block rather than a shape, so it is known by its id. */
export function isPane(value: number): boolean {
  return PANE_BLOCK_IDS.has(blockIdOf(value));
}

/**
 * A whole block that fences, walls and panes join. Glass counts though it can be
 * seen through: Mojang closed the report of fences and walls joining it as
 * working as intended (MC-147798). Leaves do not, which is also the game's rule.
 */
function isSolidToJoin(value: number): boolean {
  if (blockShapeOf(value) !== SHAPE_FULL) return false;
  const id = blockIdOf(value);
  return id === BLOCK_IDS.glass || !SEE_THROUGH_BLOCK_IDS.has(id);
}

/** Whether the face of a stair on the side (sx, sz) is solid all the way across. */
function stairFaceIsWhole(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  sx: number,
  sz: number,
): boolean {
  const quadrants = stairQuadrants(blocks, x, y, z);
  for (let index = 0; index < QUADRANT_COUNT; index += 1) {
    const [qx, qz] = quadrantSides(index);
    const onThatSide = sx !== 0 ? qx === sx : qz === sz;
    if (onThatSide && !(quadrants & (1 << index))) return false;
  }
  return true;
}

/** The three kinds of block that join their neighbours. */
type Joiner = "fence" | "wall" | "pane";

function joins(
  kind: Joiner,
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  dx: number,
  dz: number,
): boolean {
  const neighbour = blocks.get(toKey(x + dx, y, z + dz));
  if (neighbour === undefined) return false;
  if (kind === "fence") return isFence(neighbour) || isSolidToJoin(neighbour);
  if (kind === "wall") return isWall(neighbour) || isPane(neighbour) || isSolidToJoin(neighbour);

  if (isPane(neighbour) || isWall(neighbour) || isSolidToJoin(neighbour)) return true;
  // The stair's face that looks back at the pane is on its far side from it.
  return isStairs(neighbour) && stairFaceIsWhole(blocks, x + dx, y, z + dz, -dx, -dz);
}

export function connectionMask(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
): number {
  const value = blocks.get(toKey(x, y, z));
  if (value === undefined) return 0;
  const kind: Joiner | null = isPane(value)
    ? "pane"
    : isFence(value)
      ? "fence"
      : isWall(value)
        ? "wall"
        : null;
  if (!kind) return 0;

  let mask = 0;
  for (let index = 0; index < SIDES.length; index += 1) {
    const [dx, dz] = SIDES[index]!;
    if (joins(kind, blocks, x, y, z, dx, dz)) mask |= 1 << index;
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

/**
 * The footprint of a glass pane within its cell, as rectangles across x and z
 * from -0.5 to 0.5, each as min x, max x, min z, max z: a centre post and an
 * arm out to each side it joins. The sizes are Minecraft's model, two
 * sixteenths thick. The geometry and the collision both read this, so what is
 * drawn and what the player walks into cannot drift apart.
 */
export function paneRects(mask: number): [number, number, number, number][] {
  const near = 7 / 16 - 0.5;
  const far = 9 / 16 - 0.5;
  const rects: [number, number, number, number][] = [[near, far, near, far]];
  if (mask & SIDE_NORTH) rects.push([near, far, -0.5, near]);
  if (mask & SIDE_SOUTH) rects.push([near, far, far, 0.5]);
  if (mask & SIDE_WEST) rects.push([-0.5, near, near, far]);
  if (mask & SIDE_EAST) rects.push([far, 0.5, near, far]);
  return rects;
}
