/**
 * How one block is stored in the world.
 *
 * The world is a `Map<BlockKey, number>`, and that single number carries three
 * things: the block's id in the low byte, which way round it was placed in the
 * next two bits, and what shape it is in the three bits above that. Logs and
 * hay bales have a grain, so a log placed against a wall has to lie sideways
 * the way it does in the games this borrows from, and a slab is half a block.
 *
 * Packing it into one number rather than storing an object keeps the world, the
 * save format, the collision code and the renderer all working with the plain
 * map they already expect.
 *
 * The defaults are both zero, so an ordinary upright cube stores exactly its
 * id and every build saved before orientation or shapes existed still loads
 * unchanged.
 *
 * ```
 *   bits 13-14   bits 10-12   bits 8-9   bits 0-7
 *   (reserved)     shape        axis        id
 * ```
 *
 * Shape has three bits for the two shapes here because stairs are next and
 * want more, plus a facing, which the two bits above are kept clear for.
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

const ID_BITS = 8;
const ID_MASK = 0xff;
const AXIS_BITS = 10;
const AXIS_MASK = 0b11;
const SHAPE_MASK = 0b111;

export function packBlock(id: number, axis: number = AXIS_Y, shape: number = SHAPE_FULL): number {
  return id | (axis << ID_BITS) | (shape << AXIS_BITS);
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

export function isSlab(value: number): boolean {
  const shape = blockShapeOf(value);
  return shape === SHAPE_SLAB_BOTTOM || shape === SHAPE_SLAB_TOP;
}

/**
 * How far up and down a block reaches inside its own cell, which for a slab is
 * half of it. A cell centred on integer `y` covers y - 0.5 to y + 0.5.
 */
export function verticalExtent(value: number, y: number): [number, number] {
  const shape = blockShapeOf(value);
  if (shape === SHAPE_SLAB_BOTTOM) return [y - 0.5, y];
  if (shape === SHAPE_SLAB_TOP) return [y, y + 0.5];
  return [y - 0.5, y + 0.5];
}

/**
 * Which half of a cell a slab fills, from where on a face it was placed. A top
 * face gives one resting on it, a bottom face one hanging from it, and a side
 * splits down the middle. Same rule as the games this borrows from.
 */
export function slabShapeForPlacement(faceNormalY: number, hitHeightInCell: number): number {
  if (faceNormalY > 0.5) return SHAPE_SLAB_BOTTOM;
  if (faceNormalY < -0.5) return SHAPE_SLAB_TOP;
  return hitHeightInCell >= 0 ? SHAPE_SLAB_TOP : SHAPE_SLAB_BOTTOM;
}

/**
 * The axis a block should lie along when placed against a given face.
 *
 * Building on top of something gives an upright block; building against its
 * side lays the block down along the direction you built from.
 */
export function axisForFaceNormal(nx: number, ny: number, nz: number): number {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  if (ay >= ax && ay >= az) return AXIS_Y;
  return ax >= az ? AXIS_X : AXIS_Z;
}
