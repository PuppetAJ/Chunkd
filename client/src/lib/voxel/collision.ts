import {
  blockFacingOf,
  facingOffset,
  isFence,
  isStairs,
  isTrapdoor,
  isTrapdoorOpen,
  isUpsideDown,
  isWall,
  TRAPDOOR_THICKNESS,
  verticalExtent,
} from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { QUADRANT_COUNT, quadrantSides, stairQuadrants } from "./stairShape.ts";
import { connectionMask, isPane, paneRects } from "./connectionShape.ts";

/**
 * No physics engine: blocks fill their cell across X and Z and the player is an
 * upright box, so moving one axis at a time and snapping to what was hit is exact.
 */

export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
/** How high above the feet the camera sits. */
export const EYE_HEIGHT = 1.6;

/** A block centred on integer b covers [b - 0.5, b + 0.5). */
export function blockIndex(worldCoordinate: number): number {
  return Math.floor(worldCoordinate + 0.5);
}

/** Calls `visit` with the top and bottom of every block the player's box overlaps; true stops. */
function forEachOverlap(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  visit: (low: number, high: number) => boolean,
): boolean {
  const minX = blockIndex(x - PLAYER_HALF_WIDTH);
  const maxX = blockIndex(x + PLAYER_HALF_WIDTH);
  // One cell below the feet too: a fence or wall there reaches up into this cell.
  const minY = blockIndex(y) - 1;
  const maxY = blockIndex(y + PLAYER_HEIGHT);
  const minZ = blockIndex(z - PLAYER_HALF_WIDTH);
  const maxZ = blockIndex(z + PLAYER_HALF_WIDTH);
  const head = y + PLAYER_HEIGHT;

  for (let bx = minX; bx <= maxX; bx += 1) {
    for (let by = minY; by <= maxY; by += 1) {
      for (let bz = minZ; bz <= maxZ; bz += 1) {
        const value = blocks.get(toKey(bx, by, bz));
        if (value === undefined) continue;
        const extent = extentAt(blocks, value, bx, by, bz, x, z);
        if (!extent) continue;
        const [low, high] = extent;
        // Touching is not overlapping, so both comparisons are strict.
        if (y < high && head > low && visit(low, high)) return true;
      }
    }
  }
  return false;
}

/** Does the player's box at (x, z) cover any of the quarters of cell (bx, bz) in `quadrants`? */
function overlapsQuadrant(
  quadrants: number,
  bx: number,
  bz: number,
  x: number,
  z: number,
): boolean {
  const minX = x - PLAYER_HALF_WIDTH;
  const maxX = x + PLAYER_HALF_WIDTH;
  const minZ = z - PLAYER_HALF_WIDTH;
  const maxZ = z + PLAYER_HALF_WIDTH;

  for (let index = 0; index < QUADRANT_COUNT; index += 1) {
    if ((quadrants & (1 << index)) === 0) continue;
    const [sx, sz] = quadrantSides(index);
    const lowX = sx > 0 ? bx : bx - 0.5;
    const lowZ = sz > 0 ? bz : bz - 0.5;
    // Touching is not overlapping, as everywhere else here.
    if (minX < lowX + 0.5 && maxX > lowX && minZ < lowZ + 0.5 && maxZ > lowZ) return true;
  }
  return false;
}

/** Does the player's box cover the strip an open trapdoor stands in, along its hinge edge? */
function overlapsHinge(facing: number, bx: number, bz: number, x: number, z: number): boolean {
  const [fx, fz] = facingOffset(facing);
  let minX = bx - 0.5;
  let maxX = bx + 0.5;
  let minZ = bz - 0.5;
  let maxZ = bz + 0.5;
  if (fz < 0) minZ = bz + 0.5 - TRAPDOOR_THICKNESS;
  else if (fz > 0) maxZ = bz - 0.5 + TRAPDOOR_THICKNESS;
  else if (fx < 0) minX = bx + 0.5 - TRAPDOOR_THICKNESS;
  else maxX = bx - 0.5 + TRAPDOOR_THICKNESS;

  return (
    x - PLAYER_HALF_WIDTH < maxX &&
    x + PLAYER_HALF_WIDTH > minX &&
    z - PLAYER_HALF_WIDTH < maxZ &&
    z + PLAYER_HALF_WIDTH > minZ
  );
}

/** Rects are min x, max x, min z, max z, relative to the cell centre. */
function overlapsRects(
  rects: [number, number, number, number][],
  bx: number,
  bz: number,
  x: number,
  z: number,
): boolean {
  const minX = x - PLAYER_HALF_WIDTH - bx;
  const maxX = x + PLAYER_HALF_WIDTH - bx;
  const minZ = z - PLAYER_HALF_WIDTH - bz;
  const maxZ = z + PLAYER_HALF_WIDTH - bz;
  return rects.some(
    ([rectMinX, rectMaxX, rectMinZ, rectMaxZ]) =>
      minX < rectMaxX && maxX > rectMinX && minZ < rectMaxZ && maxZ > rectMinZ,
  );
}

/** A block's vertical span where the player stands. Only stairs vary across their cell. */
function extentAt(
  blocks: Map<BlockKey, number>,
  value: number,
  bx: number,
  by: number,
  bz: number,
  x: number,
  z: number,
): [number, number] | null {
  if (isStairs(value)) {
    const overTall = overlapsQuadrant(stairQuadrants(blocks, bx, by, bz), bx, bz, x, z);
    if (overTall) return [by - 0.5, by + 0.5];
    // Off the tall half, a stair is the half of the cell its solid part fills.
    return isUpsideDown(value) ? [by, by + 0.5] : [by - 0.5, by];
  }

  // Open, a trapdoor is a full-height panel along its hinge edge.
  if (isTrapdoor(value) && isTrapdoorOpen(value)) {
    return overlapsHinge(blockFacingOf(value), bx, bz, x, z) ? [by - 0.5, by + 0.5] : null;
  }

  // A block tall to look at and a block and a half to bump into, so neither can
  // be jumped: a jump peaks at about 1.35.
  if (isFence(value) || isWall(value)) return [by - 0.5, by + 1];

  // A pane collides as the shape it is drawn with, as in the game.
  if (isPane(value)) {
    const rects = paneRects(connectionMask(blocks, bx, by, bz));
    return overlapsRects(rects, bx, bz, x, z) ? [by - 0.5, by + 0.5] : null;
  }

  return verticalExtent(value, by);
}

/** Is the player's box, with its feet at (x, y, z), inside any block? */
export function collides(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
): boolean {
  return forEachOverlap(blocks, x, y, z, () => true);
}

/** The highest top and lowest bottom among the blocks the player overlaps. */
function surfacesAt(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
): { highestTop: number; lowestBottom: number } {
  let highestTop = -Infinity;
  let lowestBottom = Infinity;
  forEachOverlap(blocks, x, y, z, (low, high) => {
    if (high > highestTop) highestTop = high;
    if (low < lowestBottom) lowestBottom = low;
    return false;
  });
  return { highestTop, lowestBottom };
}

export interface Body {
  x: number;
  y: number;
  z: number;
  onGround: boolean;
}

/** Gap left against a surface stopped at, so touching never counts as overlapping. */
const SKIN = 0.001;

/** How fast the player rises out of a block they are stuck inside, per step. */
const PUSH_OUT_SPEED = 0.08;

/** Largest move per sub-step. Anything faster is split so it cannot skip a block. */
const MAX_STEP = 0.4;

/** Largest rise walked up rather than jumped: above a slab, well below a whole block. */
const STEP_HEIGHT = 0.55;

/** Bisect the step to the point of contact, which for a thin shape is not the cell edge. */
function slide(blocks: Map<BlockKey, number>, body: Body, stepX: number, stepZ: number): void {
  let clear = 0;
  let blocked = 1;
  for (let i = 0; i < 12; i += 1) {
    const middle = (clear + blocked) / 2;
    if (collides(blocks, body.x + stepX * middle, body.y, body.z + stepZ * middle)) blocked = middle;
    else clear = middle;
  }
  body.x += stepX * clear;
  body.z += stepZ * clear;
}

/** Walk up a small rise. Only from the ground, or jumping at a wall climbs it. */
function tryStepUp(
  blocks: Map<BlockKey, number>,
  body: Body,
  nextX: number,
  nextZ: number,
): boolean {
  if (!isSupported(blocks, body)) return false;

  const { highestTop } = surfacesAt(blocks, nextX, body.y, nextZ);
  if (highestTop === -Infinity) return false;

  const rise = highestTop - body.y;
  if (rise <= 0 || rise > STEP_HEIGHT) return false;

  // Without headroom the push-out branch would shove the player up through the block above.
  if (collides(blocks, nextX, highestTop, nextZ)) return false;

  body.x = nextX;
  body.z = nextZ;
  body.y = highestTop;
  body.onGround = true;
  return true;
}

/** Move `body`, stopping at whatever it hits. Mutates in place. */
export function moveBody(
  blocks: Map<BlockKey, number>,
  body: Body,
  dx: number,
  dy: number,
  dz: number,
): void {
  body.onGround = false;

  // Already inside something, likely a block placed on the player: rise out rather than fall through.
  if (collides(blocks, body.x, body.y, body.z)) {
    body.x += dx;
    body.z += dz;
    body.y += Math.max(dy, PUSH_OUT_SPEED);
    return;
  }

  const largest = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  const steps = Math.max(1, Math.ceil(largest / MAX_STEP));
  const stepX = dx / steps;
  const stepY = dy / steps;
  const stepZ = dz / steps;

  for (let i = 0; i < steps; i += 1) {
    if (stepY !== 0) {
      const nextY = body.y + stepY;
      const { highestTop, lowestBottom } = surfacesAt(blocks, body.x, nextY, body.z);
      if (highestTop !== -Infinity) {
        if (stepY < 0) {
          // Rest on the surface underfoot, which is not always the cell's top.
          body.y = highestTop;
          body.onGround = true;
        } else {
          body.y = lowestBottom - PLAYER_HEIGHT - SKIN;
        }
      } else {
        body.y = nextY;
      }
    }

    if (stepX !== 0) {
      const nextX = body.x + stepX;
      if (collides(blocks, nextX, body.y, body.z)) {
        if (!tryStepUp(blocks, body, nextX, body.z)) slide(blocks, body, stepX, 0);
      } else {
        body.x = nextX;
      }
    }

    if (stepZ !== 0) {
      const nextZ = body.z + stepZ;
      if (collides(blocks, body.x, body.y, nextZ)) {
        if (!tryStepUp(blocks, body, body.x, nextZ)) slide(blocks, body, 0, stepZ);
      } else {
        body.z = nextZ;
      }
    }
  }

  // Standing still gives no downward step to set onGround, so probe under the feet.
  if (!body.onGround) {
    body.onGround = isSupported(blocks, body);
  }
}

/** True when a block sits directly under the player's feet. */
export function isSupported(blocks: Map<BlockKey, number>, body: Body): boolean {
  return collides(blocks, body.x, body.y - 0.02, body.z);
}

/** Exact rather than generous: placing a block under your own feet is how you build up. */
export function blockOverlapsPlayer(
  body: Body,
  x: number,
  y: number,
  z: number,
): boolean {
  return (
    x >= blockIndex(body.x - PLAYER_HALF_WIDTH) &&
    x <= blockIndex(body.x + PLAYER_HALF_WIDTH) &&
    y >= blockIndex(body.y) &&
    y <= blockIndex(body.y + PLAYER_HEIGHT) &&
    z >= blockIndex(body.z - PLAYER_HALF_WIDTH) &&
    z <= blockIndex(body.z + PLAYER_HALF_WIDTH)
  );
}
