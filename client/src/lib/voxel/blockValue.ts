/**
 * One block is one number:
 *
 * ```
 *   bit 16   bit 15   bits 13-14   bits 10-12   bits 8-9   bits 0-7
 *    open     top       facing        shape        axis        id
 * ```
 *
 * Every field defaults to zero, so a plain cube is stored as its bare id and a
 * build saved before a field existed still loads.
 */

/** Upright: the block's top face points up. The default. */
export const AXIS_Y = 0;
/** Lying east to west. */
export const AXIS_X = 1;
/** Lying north to south. */
export const AXIS_Z = 2;

/** A whole cube filling its cell. The default. */
export const SHAPE_FULL = 0;
/** Half a block, sitting in the lower half of its cell. */
export const SHAPE_SLAB_BOTTOM = 1;
/** Half a block, hanging in the upper half of its cell. */
export const SHAPE_SLAB_TOP = 2;
/** A step: a bottom slab with a half-depth block on the back of it. */
export const SHAPE_STAIRS_BOTTOM = 3;
/** The same step upside down, so the full part is at the top. */
export const SHAPE_STAIRS_TOP = 4;
/** A post that joins its neighbours. Which ones is worked out, not stored. */
export const SHAPE_FENCE = 5;
/** Like a fence but thicker, with a post only where it turns or ends. */
export const SHAPE_WALL = 6;
/**
 * A thin panel across the top or bottom of its cell, or against a side when open.
 * The last value three bits hold: one more shape widens the field and moves facing.
 */
export const SHAPE_TRAPDOOR = 7;

/** How thick a trapdoor is: three pixels of sixteen, as in Minecraft. */
export const TRAPDOOR_THICKNESS = 3 / 16;

/** Which way a stair's step faces. The high side is opposite this. */
export const FACING_NORTH = 0;
export const FACING_EAST = 1;
export const FACING_SOUTH = 2;
export const FACING_WEST = 3;

const ID_BITS = 8;
const ID_MASK = 0xff;
const AXIS_BITS = 10;
const SHAPE_BITS = 13;
const AXIS_MASK = 0b11;
const SHAPE_MASK = 0b111;
const FACING_MASK = 0b11;
const TRAPDOOR_TOP_BIT = 1 << 15;
const TRAPDOOR_OPEN_BIT = 1 << 16;

export function packBlock(
  id: number,
  axis: number = AXIS_Y,
  shape: number = SHAPE_FULL,
  facing: number = FACING_NORTH,
): number {
  return id | (axis << ID_BITS) | (shape << AXIS_BITS) | (facing << SHAPE_BITS);
}

export function blockIdOf(value: number): number {
  return value & ID_MASK;
}

export function blockAxisOf(value: number): number {
  return (value >> ID_BITS) & AXIS_MASK;
}

export function blockShapeOf(value: number): number {
  return (value >> AXIS_BITS) & SHAPE_MASK;
}

export function blockFacingOf(value: number): number {
  return (value >> SHAPE_BITS) & FACING_MASK;
}

export function isSlab(value: number): boolean {
  const shape = blockShapeOf(value);
  return shape === SHAPE_SLAB_BOTTOM || shape === SHAPE_SLAB_TOP;
}

export function isStairs(value: number): boolean {
  const shape = blockShapeOf(value);
  return shape === SHAPE_STAIRS_BOTTOM || shape === SHAPE_STAIRS_TOP;
}

/** True for the shapes whose upper half is the solid one. */
export function isUpsideDown(value: number): boolean {
  const shape = blockShapeOf(value);
  return shape === SHAPE_SLAB_TOP || shape === SHAPE_STAIRS_TOP;
}

export function isFence(value: number): boolean {
  return blockShapeOf(value) === SHAPE_FENCE;
}

export function isWall(value: number): boolean {
  return blockShapeOf(value) === SHAPE_WALL;
}

export function isTrapdoor(value: number): boolean {
  return blockShapeOf(value) === SHAPE_TRAPDOOR;
}

export function packTrapdoor(id: number, facing: number, top: boolean, open: boolean): number {
  return (
    packBlock(id, AXIS_Y, SHAPE_TRAPDOOR, facing) |
    (top ? TRAPDOOR_TOP_BIT : 0) |
    (open ? TRAPDOOR_OPEN_BIT : 0)
  );
}

/** Whether a trapdoor sits across the upper half of its cell. */
export function isTrapdoorTop(value: number): boolean {
  return (value & TRAPDOOR_TOP_BIT) !== 0;
}

export function isTrapdoorOpen(value: number): boolean {
  return (value & TRAPDOOR_OPEN_BIT) !== 0;
}

/** The same trapdoor, opened if it was shut and shut if it was open. */
export function toggledTrapdoor(value: number): number {
  return value ^ TRAPDOOR_OPEN_BIT;
}

/** Render variant layout: facing in the low two bits, then top, then open. */
export const TRAPDOOR_VARIANT_TOP = 4;
export const TRAPDOOR_VARIANT_OPEN = 8;

export function trapdoorVariant(value: number): number {
  return (
    blockFacingOf(value) |
    (isTrapdoorTop(value) ? TRAPDOOR_VARIANT_TOP : 0) |
    (isTrapdoorOpen(value) ? TRAPDOOR_VARIANT_OPEN : 0)
  );
}

/** The vertical span a block fills; its cell runs from y - 0.5 to y + 0.5. */
export function verticalExtent(value: number, y: number): [number, number] {
  const shape = blockShapeOf(value);
  if (shape === SHAPE_SLAB_BOTTOM) return [y - 0.5, y];
  if (shape === SHAPE_SLAB_TOP) return [y, y + 0.5];
  if (shape === SHAPE_TRAPDOOR && !isTrapdoorOpen(value)) {
    return isTrapdoorTop(value)
      ? [y + 0.5 - TRAPDOOR_THICKNESS, y + 0.5]
      : [y - 0.5, y - 0.5 + TRAPDOOR_THICKNESS];
  }
  // Stairs, fences, walls and open trapdoors are narrowed by extentAt in collision.ts.
  return [y - 0.5, y + 0.5];
}

/** A top face gives a bottom slab, a bottom face a top slab, a side splits at the middle. */
export function slabShapeForPlacement(faceNormalY: number, hitHeightInCell: number): number {
  return upperHalfForPlacement(faceNormalY, hitHeightInCell)
    ? SHAPE_SLAB_TOP
    : SHAPE_SLAB_BOTTOM;
}

/** The same rule for stairs, which are upside down in the upper half. */
export function stairsShapeForPlacement(faceNormalY: number, hitHeightInCell: number): number {
  return upperHalfForPlacement(faceNormalY, hitHeightInCell)
    ? SHAPE_STAIRS_TOP
    : SHAPE_STAIRS_BOTTOM;
}

function upperHalfForPlacement(faceNormalY: number, hitHeightInCell: number): boolean {
  if (faceNormalY > 0.5) return false;
  if (faceNormalY < -0.5) return true;
  return hitHeightInCell >= 0;
}

/** Faces back towards the player, so walking forwards goes up it. Yaw 0 looks along -Z. */
export function facingForYaw(yaw: number): number {
  // The camera looks along (-sin yaw, -cos yaw); the player stands on the opposite side.
  const x = Math.sin(yaw);
  const z = Math.cos(yaw);
  if (Math.abs(x) > Math.abs(z)) return x > 0 ? FACING_EAST : FACING_WEST;
  return z > 0 ? FACING_SOUTH : FACING_NORTH;
}

/** The unit step from a cell towards the side a stair's low half faces. */
export function facingOffset(facing: number): [number, number] {
  if (facing === FACING_EAST) return [1, 0];
  if (facing === FACING_SOUTH) return [0, 1];
  if (facing === FACING_WEST) return [-1, 0];
  return [0, -1];
}

/** Upright on a top or bottom face, laid along the direction built from on a side. */
export function axisForFaceNormal(nx: number, ny: number, nz: number): number {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  if (ay >= ax && ay >= az) return AXIS_Y;
  return ax >= az ? AXIS_X : AXIS_Z;
}

/** Whether a trapdoor placed on this face goes in the upper half, by the slab rule. */
export function trapdoorTopForPlacement(faceNormalY: number, hitHeightInCell: number): boolean {
  return upperHalfForPlacement(faceNormalY, hitHeightInCell);
}

/** Against a side the hinge goes on that block; on a top or bottom face it faces the player. */
export function trapdoorFacingForPlacement(normalX: number, normalZ: number, yaw: number): number {
  if (normalX > 0.5) return FACING_EAST;
  if (normalX < -0.5) return FACING_WEST;
  if (normalZ > 0.5) return FACING_SOUTH;
  if (normalZ < -0.5) return FACING_NORTH;
  return facingForYaw(yaw);
}
