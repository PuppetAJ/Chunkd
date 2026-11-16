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

export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.6;

export function blockIndex(worldCoordinate: number): number {
  return Math.floor(worldCoordinate + 0.5);
}

function forEachOverlap(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  visit: (low: number, high: number) => boolean,
): boolean {
  const minX = blockIndex(x - PLAYER_HALF_WIDTH);
  const maxX = blockIndex(x + PLAYER_HALF_WIDTH);
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
        if (y < high && head > low && visit(low, high)) return true;
      }
    }
  }
  return false;
}

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
    if (minX < lowX + 0.5 && maxX > lowX && minZ < lowZ + 0.5 && maxZ > lowZ) return true;
  }
  return false;
}

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
    return isUpsideDown(value) ? [by, by + 0.5] : [by - 0.5, by];
  }

  if (isTrapdoor(value) && isTrapdoorOpen(value)) {
    return overlapsHinge(blockFacingOf(value), bx, bz, x, z) ? [by - 0.5, by + 0.5] : null;
  }

  if (isFence(value) || isWall(value)) return [by - 0.5, by + 1];

  if (isPane(value)) {
    const rects = paneRects(connectionMask(blocks, bx, by, bz));
    return overlapsRects(rects, bx, bz, x, z) ? [by - 0.5, by + 0.5] : null;
  }

  return verticalExtent(value, by);
}

export function collides(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
): boolean {
  return forEachOverlap(blocks, x, y, z, () => true);
}

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

const SKIN = 0.001;

const PUSH_OUT_SPEED = 0.08;

const MAX_STEP = 0.4;

const STEP_HEIGHT = 0.55;

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

  if (collides(blocks, nextX, highestTop, nextZ)) return false;

  body.x = nextX;
  body.z = nextZ;
  body.y = highestTop;
  body.onGround = true;
  return true;
}

export function moveBody(
  blocks: Map<BlockKey, number>,
  body: Body,
  dx: number,
  dy: number,
  dz: number,
): void {
  body.onGround = false;

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

  if (!body.onGround) {
    body.onGround = isSupported(blocks, body);
  }
}

export function isSupported(blocks: Map<BlockKey, number>, body: Body): boolean {
  return collides(blocks, body.x, body.y - 0.02, body.z);
}

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
