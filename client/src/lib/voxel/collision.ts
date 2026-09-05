import { toKey, type BlockKey } from "./coords.ts";

/**
 * Collision between the player and the block grid.
 *
 * There is no physics engine. Every block is a unit cube on integer
 * coordinates and the player is an upright box, so an exact answer is a few
 * comparisons rather than a general solver. Moving one axis at a time and
 * snapping to the surface that was hit is the standard way to do this, and it
 * gives sliding along walls for free: being blocked on X does not stop Z.
 */

export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
/** How high above the feet the camera sits. */
export const EYE_HEIGHT = 1.6;

/** A block centred on integer b covers [b - 0.5, b + 0.5). */
export function blockIndex(worldCoordinate: number): number {
  return Math.floor(worldCoordinate + 0.5);
}

/** Is the player's box, with its feet at (x, y, z), inside any block? */
function collides(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
): boolean {
  const minX = blockIndex(x - PLAYER_HALF_WIDTH);
  const maxX = blockIndex(x + PLAYER_HALF_WIDTH);
  const minY = blockIndex(y);
  const maxY = blockIndex(y + PLAYER_HEIGHT);
  const minZ = blockIndex(z - PLAYER_HALF_WIDTH);
  const maxZ = blockIndex(z + PLAYER_HALF_WIDTH);

  for (let bx = minX; bx <= maxX; bx += 1) {
    for (let by = minY; by <= maxY; by += 1) {
      for (let bz = minZ; bz <= maxZ; bz += 1) {
        if (blocks.has(toKey(bx, by, bz))) return true;
      }
    }
  }
  return false;
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

/** Largest move per sub-step. Anything faster is split so it cannot skip a block. */
const MAX_STEP = 0.4;

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

  // Already inside something, most likely a block placed on top of the player
  // or a bad spawn. Let them move freely out rather than pinning them in place.
  if (collides(blocks, body.x, body.y, body.z)) {
    body.x += dx;
    body.y += dy;
    body.z += dz;
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
      if (collides(blocks, body.x, nextY, body.z)) {
        if (stepY < 0) {
          // Landed. Rest exactly on the surface of the block underfoot rather
          // than wherever the frame happened to stop.
          body.y = blockIndex(nextY) + 0.5;
          body.onGround = true;
        } else {
          // Hit a ceiling. Sit just below it.
          body.y = blockIndex(nextY + PLAYER_HEIGHT) - 0.5 - PLAYER_HEIGHT - SKIN;
        }
      } else {
        body.y = nextY;
      }
    }

    if (stepX !== 0) {
      const nextX = body.x + stepX;
      if (collides(blocks, nextX, body.y, body.z)) {
        const side = Math.sign(stepX);
        body.x = blockIndex(nextX + side * PLAYER_HALF_WIDTH) - side * (0.5 + PLAYER_HALF_WIDTH + SKIN);
      } else {
        body.x = nextX;
      }
    }

    if (stepZ !== 0) {
      const nextZ = body.z + stepZ;
      if (collides(blocks, body.x, body.y, nextZ)) {
        const side = Math.sign(stepZ);
        body.z = blockIndex(nextZ + side * PLAYER_HALF_WIDTH) - side * (0.5 + PLAYER_HALF_WIDTH + SKIN);
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
