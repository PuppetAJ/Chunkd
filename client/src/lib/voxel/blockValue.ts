/**
 * How one block is stored in the world.
 *
 * The world is a `Map<BlockKey, number>`, and that single number carries two
 * things: the block's id in the low byte, and which way round it was placed in
 * the next two bits. Logs and hay bales have a grain, so a log placed against a
 * wall has to lie sideways the way it does in the games this borrows from.
 *
 * Packing it into one number rather than storing an object keeps the world, the
 * save format, the collision code and the renderer all working with the plain
 * map they already expect.
 *
 * Upright is axis 0, so an ordinary block stores exactly its id and every build
 * saved before orientation existed still loads unchanged.
 */

/** Upright: the block's top face points up. The default. */
export const AXIS_Y = 0;
/** Lying east to west. */
export const AXIS_X = 1;
/** Lying north to south. */
export const AXIS_Z = 2;

const ID_BITS = 8;
const ID_MASK = 0xff;
const AXIS_MASK = 0b11;

export function packBlock(id: number, axis: number = AXIS_Y): number {
  return id | (axis << ID_BITS);
}

export function blockIdOf(value: number): number {
  return value & ID_MASK;
}

export function blockAxisOf(value: number): number {
  return (value >> ID_BITS) & AXIS_MASK;
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
