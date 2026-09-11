import {
  isFence,
  isStairs,
  isTrapdoor,
  isTrapdoorOpen,
  isUpsideDown,
  isWall,
  verticalExtent,
} from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { QUADRANT_COUNT, quadrantSides, stairQuadrants } from "./stairShape.ts";

/**
 * Collision between the player and the block grid.
 *
 * There is no physics engine. Every block fills its cell across X and Z and
 * the player is an upright box, so an exact answer is a few comparisons rather
 * than a general solver. Moving one axis at a time and snapping to the surface
 * that was hit is the standard way to do this, and it gives sliding along walls
 * for free: being blocked on X does not stop Z.
 *
 * Height is the one thing the cell does not decide: a slab fills half of it,
 * so the surface underfoot comes from the block. Across X and Z a slab still
 * fills its cell, so walls, sliding and the reach checks are unchanged.
 *
 * Stairs are the exception to that last part, and the only shape whose height
 * changes across its own cell. They are handled in `extentAt` below.
 */

export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
/** How high above the feet the camera sits. */
export const EYE_HEIGHT = 1.6;

/** A block centred on integer b covers [b - 0.5, b + 0.5). */
export function blockIndex(worldCoordinate: number): number {
  return Math.floor(worldCoordinate + 0.5);
}

/**
 * Every block the player's box would overlap, with its feet at (x, y, z).
 * `visit` gets the top and bottom of each; returning true stops the search.
 */
function forEachOverlap(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  visit: (low: number, high: number) => boolean,
): boolean {
  const minX = blockIndex(x - PLAYER_HALF_WIDTH);
  const maxX = blockIndex(x + PLAYER_HALF_WIDTH);
  // One cell below the feet, because a fence or wall there reaches half a block
  // up into the cell the player is in.
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

/**
 * Does the player's box, standing at (x, z), cover any of the quarters of cell
 * (bx, bz) named by `quadrants`?
 */
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

/**
 * How tall a block is where the player is standing.
 *
 * Every shape but stairs is the same height across its whole cell, so the
 * block's own extent is the whole answer. A stair is not: its tall half covers
 * only some quarters of the cell, and whether the player is over one of those
 * decides whether they stand at half height or full height.
 *
 * This used to report a stair as a whole cube, which made walking onto one a
 * full block rise, above the step height, so a staircase could not be climbed
 * without jumping up every step.
 */
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
    // Away from the tall half, a stair is the half of the cell its solid part
    // fills: the bottom one normally, the top one when it is upside down.
    return isUpsideDown(value) ? [by, by + 0.5] : [by - 0.5, by];
  }

  // An open trapdoor is a passage, which is how Minecraft treats it.
  if (isTrapdoor(value) && isTrapdoorOpen(value)) return null;

  // A block tall to look at and a block and a half to bump into, so neither can
  // be jumped: a jump peaks at about 1.35.
  if (isFence(value) || isWall(value)) return [by - 0.5, by + 1];

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

/**
 * The highest surface among the blocks the player is overlapping, which is what
 * they land on, and the lowest, which is what they hit their head on.
 */
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

/**
 * Gap left between the player and any surface they stop against.
 *
 * Snapping the player's edge exactly onto a block boundary put that edge inside
 * the block by the overlap test's definition, so after touching a wall every
 * further move on every axis was reported as blocked and the player was stuck.
 * A hair of clearance means "touching" is never "overlapping".
 */
const SKIN = 0.001;

/** How fast the player rises out of a block they are stuck inside, per step. */
const PUSH_OUT_SPEED = 0.08;

/** Largest move per sub-step. Anything faster is split so it cannot skip a block. */
const MAX_STEP = 0.4;

/**
 * Largest rise the player walks up instead of jumping. Just above half a block
 * and well below a whole one, so a slab is a step and a wall stays a wall.
 */
const STEP_HEIGHT = 0.55;

/**
 * Walk up a small rise rather than stopping against it, and say whether that
 * happened. Only from the ground: doing it mid-air would catch a falling
 * player on a ledge, and let a jumping one climb a wall half a block per hop.
 */
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

  // Room to stand there. Otherwise the player is lifted into whatever is above
  // the step and the push-out branch shoves them up through it.
  if (collides(blocks, nextX, highestTop, nextZ)) return false;

  body.x = nextX;
  body.z = nextZ;
  body.y = highestTop;
  body.onGround = true;
  return true;
}

/**
 * Move `body` by the given amounts, stopping at whatever it runs into.
 *
 * Mutates the body in place because it runs every frame and allocating three
 * vectors per frame is exactly the kind of garbage the old player controller
 * produced.
 */
export function moveBody(
  blocks: Map<BlockKey, number>,
  body: Body,
  dx: number,
  dy: number,
  dz: number,
): void {
  body.onGround = false;

  // Already inside something, most likely a block placed on top of the player.
  // Turning collision off entirely here, which is what this used to do, meant
  // gravity carried them straight down through the ground and out of the world.
  // Rise out of it instead, and let them walk out horizontally while they do.
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
          // Hit a ceiling. Sit just below it.
          body.y = lowestBottom - PLAYER_HEIGHT - SKIN;
        }
      } else {
        body.y = nextY;
      }
    }

    if (stepX !== 0) {
      const nextX = body.x + stepX;
      if (collides(blocks, nextX, body.y, body.z)) {
        if (!tryStepUp(blocks, body, nextX, body.z)) {
          const side = Math.sign(stepX);
          body.x = blockIndex(nextX + side * PLAYER_HALF_WIDTH) - side * (0.5 + PLAYER_HALF_WIDTH + SKIN);
        }
      } else {
        body.x = nextX;
      }
    }

    if (stepZ !== 0) {
      const nextZ = body.z + stepZ;
      if (collides(blocks, body.x, body.y, nextZ)) {
        if (!tryStepUp(blocks, body, body.x, nextZ)) {
          const side = Math.sign(stepZ);
          body.z = blockIndex(nextZ + side * PLAYER_HALF_WIDTH) - side * (0.5 + PLAYER_HALF_WIDTH + SKIN);
        }
      } else {
        body.z = nextZ;
      }
    }
  }

  // Standing still produces no downward movement, so onGround would never be
  // set by the branch above. Probe just below the feet instead.
  if (!body.onGround) {
    body.onGround = isSupported(blocks, body);
  }
}

/** True when a block sits directly under the player's feet. */
export function isSupported(blocks: Map<BlockKey, number>, body: Body): boolean {
  return collides(blocks, body.x, body.y - 0.02, body.z);
}

/**
 * Would a block at these coordinates be inside the player?
 *
 * Used to refuse placing a block into the space the player occupies, which
 * would trap them. Placing a block *under* your own feet is the standard way to
 * build upwards, so this has to be exact rather than generous: it decides
 * whether pillar jumping is possible at all.
 */
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
