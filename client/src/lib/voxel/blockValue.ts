export const AXIS_Y = 0;
export const AXIS_X = 1;
export const AXIS_Z = 2;

export const SHAPE_FULL = 0;
export const SHAPE_SLAB_BOTTOM = 1;
export const SHAPE_SLAB_TOP = 2;
export const SHAPE_STAIRS_BOTTOM = 3;
export const SHAPE_STAIRS_TOP = 4;
export const SHAPE_FENCE = 5;
export const SHAPE_WALL = 6;
export const SHAPE_TRAPDOOR = 7;

export const TRAPDOOR_THICKNESS = 3 / 16;

export const FACING_NORTH = 0;
export const FACING_EAST = 1;
export const FACING_SOUTH = 2;
export const FACING_WEST = 3;

const AXIS_SHIFT = 8;
const ID_MASK = 0xff;
const SHAPE_SHIFT = 10;
const FACING_SHIFT = 13;
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
  return id | (axis << AXIS_SHIFT) | (shape << SHAPE_SHIFT) | (facing << FACING_SHIFT);
}

export function blockIdOf(value: number): number {
  return value & ID_MASK;
}

export function blockAxisOf(value: number): number {
  return (value >> AXIS_SHIFT) & AXIS_MASK;
}

export function blockShapeOf(value: number): number {
  return (value >> SHAPE_SHIFT) & SHAPE_MASK;
}

export function blockFacingOf(value: number): number {
  return (value >> FACING_SHIFT) & FACING_MASK;
}

export function isSlab(value: number): boolean {
  const shape = blockShapeOf(value);
  return shape === SHAPE_SLAB_BOTTOM || shape === SHAPE_SLAB_TOP;
}

export function isStairs(value: number): boolean {
  const shape = blockShapeOf(value);
  return shape === SHAPE_STAIRS_BOTTOM || shape === SHAPE_STAIRS_TOP;
}

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

export function isTrapdoorTop(value: number): boolean {
  return (value & TRAPDOOR_TOP_BIT) !== 0;
}

export function isTrapdoorOpen(value: number): boolean {
  return (value & TRAPDOOR_OPEN_BIT) !== 0;
}

export function toggledTrapdoor(value: number): number {
  return value ^ TRAPDOOR_OPEN_BIT;
}

export const TRAPDOOR_VARIANT_TOP = 4;
export const TRAPDOOR_VARIANT_OPEN = 8;

export function trapdoorVariant(value: number): number {
  return (
    blockFacingOf(value) |
    (isTrapdoorTop(value) ? TRAPDOOR_VARIANT_TOP : 0) |
    (isTrapdoorOpen(value) ? TRAPDOOR_VARIANT_OPEN : 0)
  );
}

export function verticalExtent(value: number, y: number): [number, number] {
  const shape = blockShapeOf(value);
  if (shape === SHAPE_SLAB_BOTTOM) return [y - 0.5, y];
  if (shape === SHAPE_SLAB_TOP) return [y, y + 0.5];
  if (shape === SHAPE_TRAPDOOR && !isTrapdoorOpen(value)) {
    return isTrapdoorTop(value)
      ? [y + 0.5 - TRAPDOOR_THICKNESS, y + 0.5]
      : [y - 0.5, y - 0.5 + TRAPDOOR_THICKNESS];
  }
  return [y - 0.5, y + 0.5];
}

export function slabShapeForPlacement(faceNormalY: number, hitHeightInCell: number): number {
  return upperHalfForPlacement(faceNormalY, hitHeightInCell)
    ? SHAPE_SLAB_TOP
    : SHAPE_SLAB_BOTTOM;
}

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

export function facingForYaw(yaw: number): number {
  const x = Math.sin(yaw);
  const z = Math.cos(yaw);
  if (Math.abs(x) > Math.abs(z)) return x > 0 ? FACING_EAST : FACING_WEST;
  return z > 0 ? FACING_SOUTH : FACING_NORTH;
}

export function facingOffset(facing: number): [number, number] {
  if (facing === FACING_EAST) return [1, 0];
  if (facing === FACING_SOUTH) return [0, 1];
  if (facing === FACING_WEST) return [-1, 0];
  return [0, -1];
}

export function axisForFaceNormal(nx: number, ny: number, nz: number): number {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  if (ay >= ax && ay >= az) return AXIS_Y;
  return ax >= az ? AXIS_X : AXIS_Z;
}

export function trapdoorTopForPlacement(faceNormalY: number, hitHeightInCell: number): boolean {
  return upperHalfForPlacement(faceNormalY, hitHeightInCell);
}

export function trapdoorFacingForPlacement(normalX: number, normalZ: number, yaw: number): number {
  if (normalX > 0.5) return FACING_EAST;
  if (normalX < -0.5) return FACING_WEST;
  if (normalZ > 0.5) return FACING_SOUTH;
  if (normalZ < -0.5) return FACING_NORTH;
  return facingForYaw(yaw);
}
