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

  if (dy !== 0) {
    const nextY = body.y + dy;
    if (collides(blocks, body.x, nextY, body.z)) {
      if (dy < 0) {
        // Landed. Rest exactly on the surface of the block underfoot rather
        // than wherever the frame happened to stop.
        body.y = blockIndex(nextY) + 0.5;
        body.onGround = true;
      } else {
        // Hit a ceiling. Sit just below it.
        body.y = blockIndex(nextY + PLAYER_HEIGHT) - 0.5 - PLAYER_HEIGHT;
      }
    } else {
      body.y = nextY;
    }
  }

  if (dx !== 0) {
    const nextX = body.x + dx;
    if (collides(blocks, nextX, body.y, body.z)) {
      const side = Math.sign(dx);
      body.x = blockIndex(nextX + side * PLAYER_HALF_WIDTH) - side * (0.5 + PLAYER_HALF_WIDTH);
    } else {
      body.x = nextX;
    }
  }

  if (dz !== 0) {
    const nextZ = body.z + dz;
    if (collides(blocks, body.x, body.y, nextZ)) {
      const side = Math.sign(dz);
      body.z = blockIndex(nextZ + side * PLAYER_HALF_WIDTH) - side * (0.5 + PLAYER_HALF_WIDTH);
    } else {
      body.z = nextZ;
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
