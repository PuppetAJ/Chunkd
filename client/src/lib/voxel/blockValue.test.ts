import assert from "node:assert/strict";
import test from "node:test";

import { BLOCK_IDS } from "./blockIds.ts";
import {
  AXIS_X,
  AXIS_Y,
  AXIS_Z,
  axisForFaceNormal,
  blockAxisOf,
  blockIdOf,
  blockFacingOf,
  blockShapeOf,
  facingForYaw,
  facingOffset,
  isSlab,
  isStairs,
  isUpsideDown,
  packBlock,
  slabShapeForPlacement,
  stairsShapeForPlacement,
  FACING_EAST,
  FACING_NORTH,
  FACING_SOUTH,
  FACING_WEST,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
  verticalExtent,
} from "./blockValue.ts";

test("an upright block stores exactly its id", () => {
  // This is what keeps builds saved before orientation existed loading
  // unchanged: their stored values are plain ids.
  assert.equal(packBlock(BLOCK_IDS.oakLog, AXIS_Y), BLOCK_IDS.oakLog);
  assert.equal(packBlock(BLOCK_IDS.grass), BLOCK_IDS.grass);
});

test("id and axis survive a round trip", () => {
  for (const id of [BLOCK_IDS.dirt, BLOCK_IDS.oakLog, BLOCK_IDS.hayBale, 255]) {
    for (const axis of [AXIS_Y, AXIS_X, AXIS_Z]) {
      const value = packBlock(id, axis);
      assert.equal(blockIdOf(value), id, `id ${id} axis ${axis}`);
      assert.equal(blockAxisOf(value), axis, `id ${id} axis ${axis}`);
    }
  }
});

test("every block id in the table fits in the packed low byte", () => {
  for (const id of Object.values(BLOCK_IDS)) {
    assert.ok(id >= 1 && id <= 255, `id ${id} is out of range`);
  }
});

test("building on a top or bottom face leaves a block upright", () => {
  assert.equal(axisForFaceNormal(0, 1, 0), AXIS_Y);
  assert.equal(axisForFaceNormal(0, -1, 0), AXIS_Y);
});

test("building against a side lays the block along that direction", () => {
  assert.equal(axisForFaceNormal(1, 0, 0), AXIS_X);
  assert.equal(axisForFaceNormal(-1, 0, 0), AXIS_X);
  assert.equal(axisForFaceNormal(0, 0, 1), AXIS_Z);
  assert.equal(axisForFaceNormal(0, 0, -1), AXIS_Z);
});

test("a slightly off normal still picks the axis it points most along", () => {
  // Normals come from a raycast and are transformed by an instance matrix, so
  // they are not exactly axis aligned by the time they get here.
  assert.equal(axisForFaceNormal(0.02, 0.999, -0.01), AXIS_Y);
  assert.equal(axisForFaceNormal(-0.998, 0.03, 0.05), AXIS_X);
  assert.equal(axisForFaceNormal(0.04, -0.02, 0.997), AXIS_Z);
});

test("a full cube still stores exactly its id once shapes exist", () => {
  // Same guarantee as orientation: the default shape is zero, so adding shapes
  // did not change what an ordinary block is stored as, and no saved build
  // means anything different than it did before.
  assert.equal(packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_FULL), BLOCK_IDS.stone);
  assert.equal(packBlock(BLOCK_IDS.stone), BLOCK_IDS.stone);
});

test("id, axis and shape survive a round trip together", () => {
  for (const id of [BLOCK_IDS.dirt, BLOCK_IDS.oakLog, 255]) {
    for (const axis of [AXIS_Y, AXIS_X, AXIS_Z]) {
      for (const shape of [SHAPE_FULL, SHAPE_SLAB_BOTTOM, SHAPE_SLAB_TOP]) {
        const value = packBlock(id, axis, shape);
        const where = `id ${id} axis ${axis} shape ${shape}`;
        assert.equal(blockIdOf(value), id, where);
        assert.equal(blockAxisOf(value), axis, where);
        assert.equal(blockShapeOf(value), shape, where);
      }
    }
  }
});

test("the shape bits sit above the axis bits and do not disturb them", () => {
  // The three fields share one number, so the thing worth checking is that
  // setting the highest one cannot change the lower two.
  const log = packBlock(BLOCK_IDS.oakLog, AXIS_X);
  const logSlab = packBlock(BLOCK_IDS.oakLog, AXIS_X, SHAPE_SLAB_TOP);
  assert.equal(blockIdOf(logSlab), blockIdOf(log));
  assert.equal(blockAxisOf(logSlab), blockAxisOf(log));
  assert.notEqual(logSlab, log);
});

test("a slab fills half its cell and a cube fills all of it", () => {
  assert.deepEqual(verticalExtent(packBlock(BLOCK_IDS.stone), 10), [9.5, 10.5]);
  assert.deepEqual(verticalExtent(packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM), 10), [9.5, 10]);
  assert.deepEqual(verticalExtent(packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_TOP), 10), [10, 10.5]);
});

test("isSlab is true for both halves and false for a cube", () => {
  assert.equal(isSlab(packBlock(BLOCK_IDS.stone)), false);
  assert.equal(isSlab(packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM)), true);
  assert.equal(isSlab(packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_TOP)), true);
});

test("building on a top face lays the slab on it, and under a bottom face hangs it", () => {
  // The height passed in is ignored for these two, because a top face is
  // entirely at the top of its block and there is no half to choose.
  assert.equal(slabShapeForPlacement(1, 0.5), SHAPE_SLAB_BOTTOM);
  assert.equal(slabShapeForPlacement(-1, -0.5), SHAPE_SLAB_TOP);
});

test("building against a side splits the face down the middle", () => {
  // This is the half of the rule that makes a slab wall possible: aim at the
  // upper half of a face and the slab goes high, aim low and it goes low.
  assert.equal(slabShapeForPlacement(0, 0.3), SHAPE_SLAB_TOP);
  assert.equal(slabShapeForPlacement(0, -0.3), SHAPE_SLAB_BOTTOM);
  // Exactly halfway has to land somewhere rather than be undefined.
  assert.equal(slabShapeForPlacement(0, 0), SHAPE_SLAB_TOP);
});

test("id, axis, shape and facing all survive together", () => {
  for (const shape of [SHAPE_FULL, SHAPE_SLAB_TOP, SHAPE_STAIRS_BOTTOM, SHAPE_STAIRS_TOP]) {
    for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
      const value = packBlock(BLOCK_IDS.stoneBricks, AXIS_Y, shape, facing);
      const where = `shape ${shape} facing ${facing}`;
      assert.equal(blockIdOf(value), BLOCK_IDS.stoneBricks, where);
      assert.equal(blockShapeOf(value), shape, where);
      assert.equal(blockFacingOf(value), facing, where);
    }
  }
});

test("a plain cube is still stored as its bare id with a facing of zero", () => {
  assert.equal(packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_FULL, FACING_NORTH), BLOCK_IDS.stone);
});

test("stairs collide as a whole cube", () => {
  // The decision behind step assist: exact per-shape collision was the
  // expensive part, and a stair is a half block rise, so it is walked up.
  for (const shape of [SHAPE_STAIRS_BOTTOM, SHAPE_STAIRS_TOP]) {
    assert.deepEqual(verticalExtent(packBlock(BLOCK_IDS.stone, AXIS_Y, shape), 10), [9.5, 10.5]);
  }
});

test("a stair's low step faces the player who placed it", () => {
  // So that walking forwards goes up it. The camera looks along -Z at yaw 0,
  // which puts the player to the south of what they are looking at.
  assert.equal(facingForYaw(0), FACING_SOUTH);
  assert.equal(facingForYaw(Math.PI / 2), FACING_EAST);
  assert.equal(facingForYaw(Math.PI), FACING_NORTH);
  assert.equal(facingForYaw(-Math.PI / 2), FACING_WEST);
});

test("a yaw between two directions picks the nearer one", () => {
  // Yaw comes from mouse-look, so it is never exactly on a quarter turn.
  assert.equal(facingForYaw(0.2), FACING_SOUTH);
  assert.equal(facingForYaw(-0.2), FACING_SOUTH);
  assert.equal(facingForYaw(Math.PI / 2 - 0.2), FACING_EAST);
  assert.equal(facingForYaw(Math.PI + 0.3), FACING_NORTH);
  // Wrapping past a full turn has to behave the same as not wrapping.
  assert.equal(facingForYaw(2 * Math.PI), FACING_SOUTH);
  assert.equal(facingForYaw(-2 * Math.PI + Math.PI / 2), FACING_EAST);
});

test("the facing offset points at the low side", () => {
  assert.deepEqual(facingOffset(FACING_NORTH), [0, -1]);
  assert.deepEqual(facingOffset(FACING_EAST), [1, 0]);
  assert.deepEqual(facingOffset(FACING_SOUTH), [0, 1]);
  assert.deepEqual(facingOffset(FACING_WEST), [-1, 0]);
});

test("stairs take the same upper or lower half rule as slabs", () => {
  assert.equal(stairsShapeForPlacement(1, 0.5), SHAPE_STAIRS_BOTTOM);
  assert.equal(stairsShapeForPlacement(-1, -0.5), SHAPE_STAIRS_TOP);
  assert.equal(stairsShapeForPlacement(0, 0.3), SHAPE_STAIRS_TOP);
  assert.equal(stairsShapeForPlacement(0, -0.3), SHAPE_STAIRS_BOTTOM);
});

test("isStairs and isUpsideDown sort the shapes", () => {
  const at = (shape: number) => packBlock(BLOCK_IDS.stone, AXIS_Y, shape);
  assert.equal(isStairs(at(SHAPE_STAIRS_BOTTOM)), true);
  assert.equal(isStairs(at(SHAPE_SLAB_BOTTOM)), false);
  assert.equal(isUpsideDown(at(SHAPE_STAIRS_TOP)), true);
  assert.equal(isUpsideDown(at(SHAPE_SLAB_TOP)), true);
  assert.equal(isUpsideDown(at(SHAPE_STAIRS_BOTTOM)), false);
  assert.equal(isUpsideDown(at(SHAPE_FULL)), false);
});
