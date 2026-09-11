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
  isFence,
  isTrapdoor,
  isTrapdoorOpen,
  isTrapdoorTop,
  isWall,
  packTrapdoor,
  SHAPE_FENCE,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
  toggledTrapdoor,
  TRAPDOOR_THICKNESS,
  TRAPDOOR_VARIANT_OPEN,
  TRAPDOOR_VARIANT_TOP,
  trapdoorFacingForPlacement,
  trapdoorTopForPlacement,
  trapdoorVariant,
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

test("a stair's own extent is the whole cube it could fill", () => {
  // On its own a stair says it fills its cell top to bottom, because from the
  // value alone that is the most that can be said: which quarters its tall half
  // covers depends on its neighbours. Collision narrows this per quarter, which
  // is what makes a stair walkable; see extentAt in collision.ts.
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

test("a trapdoor's facing, half and open state survive a round trip", () => {
  for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
    for (const top of [false, true]) {
      for (const open of [false, true]) {
        const value = packTrapdoor(BLOCK_IDS.oakPlanks, facing, top, open);
        const label = `facing ${facing} top ${top} open ${open}`;
        assert.equal(blockIdOf(value), BLOCK_IDS.oakPlanks, label);
        assert.equal(blockShapeOf(value), SHAPE_TRAPDOOR, label);
        assert.equal(blockFacingOf(value), facing, label);
        assert.equal(isTrapdoorTop(value), top, label);
        assert.equal(isTrapdoorOpen(value), open, label);
      }
    }
  }
});

test("the trapdoor bits are clear on every other shape", () => {
  // No value saved before trapdoors existed ever set these bits, which is what
  // lets every older build read exactly as it did.
  for (const shape of [
    SHAPE_FULL,
    SHAPE_SLAB_BOTTOM,
    SHAPE_SLAB_TOP,
    SHAPE_STAIRS_BOTTOM,
    SHAPE_STAIRS_TOP,
    SHAPE_FENCE,
    SHAPE_WALL,
  ]) {
    const value = packBlock(BLOCK_IDS.stoneBricks, AXIS_Y, shape, FACING_WEST);
    assert.equal(isTrapdoorTop(value), false, `shape ${shape}`);
    assert.equal(isTrapdoorOpen(value), false, `shape ${shape}`);
  }
});

test("toggling a trapdoor changes only whether it is open", () => {
  const shut = packTrapdoor(BLOCK_IDS.birchPlanks, FACING_SOUTH, true, false);
  const open = toggledTrapdoor(shut);
  assert.equal(isTrapdoorOpen(open), true);
  assert.equal(blockFacingOf(open), FACING_SOUTH);
  assert.equal(isTrapdoorTop(open), true);
  assert.equal(toggledTrapdoor(open), shut);
});

test("each new shape is recognised as itself and nothing else", () => {
  const fence = packBlock(BLOCK_IDS.oakPlanks, AXIS_Y, SHAPE_FENCE);
  const wall = packBlock(BLOCK_IDS.cobblestone, AXIS_Y, SHAPE_WALL);
  const trapdoor = packTrapdoor(BLOCK_IDS.oakPlanks, FACING_NORTH, false, false);
  assert.deepEqual([isFence(fence), isWall(fence), isTrapdoor(fence)], [true, false, false]);
  assert.deepEqual([isFence(wall), isWall(wall), isTrapdoor(wall)], [false, true, false]);
  assert.deepEqual([isFence(trapdoor), isWall(trapdoor), isTrapdoor(trapdoor)], [false, false, true]);
});

test("a shut trapdoor is three sixteenths thick, in its own half", () => {
  const bottom = packTrapdoor(BLOCK_IDS.oakPlanks, FACING_NORTH, false, false);
  const top = packTrapdoor(BLOCK_IDS.oakPlanks, FACING_NORTH, true, false);
  assert.deepEqual(verticalExtent(bottom, 10), [9.5, 9.5 + TRAPDOOR_THICKNESS]);
  assert.deepEqual(verticalExtent(top, 10), [10.5 - TRAPDOOR_THICKNESS, 10.5]);
});

test("fences, walls and open trapdoors outline their whole cell", () => {
  // The outline is what is drawn. Collision is what makes fences and walls
  // taller and open trapdoors passable.
  for (const value of [
    packBlock(BLOCK_IDS.oakPlanks, AXIS_Y, SHAPE_FENCE),
    packBlock(BLOCK_IDS.cobblestone, AXIS_Y, SHAPE_WALL),
    packTrapdoor(BLOCK_IDS.oakPlanks, FACING_EAST, false, true),
  ]) {
    assert.deepEqual(verticalExtent(value, 10), [9.5, 10.5]);
  }
});

test("a trapdoor's render variant carries its facing, half and open state", () => {
  const variant = trapdoorVariant(packTrapdoor(BLOCK_IDS.oakPlanks, FACING_WEST, true, true));
  assert.equal(variant & 0b11, FACING_WEST);
  assert.ok(variant & TRAPDOOR_VARIANT_TOP);
  assert.ok(variant & TRAPDOOR_VARIANT_OPEN);
  assert.equal(trapdoorVariant(packTrapdoor(BLOCK_IDS.oakPlanks, FACING_NORTH, false, false)), 0);
});

test("a trapdoor built against a side faces out from it", () => {
  // Its hinge is on the block it was built against, so it opens flat against it.
  assert.equal(trapdoorFacingForPlacement(1, 0, 0), FACING_EAST);
  assert.equal(trapdoorFacingForPlacement(-1, 0, 0), FACING_WEST);
  assert.equal(trapdoorFacingForPlacement(0, 1, 0), FACING_SOUTH);
  assert.equal(trapdoorFacingForPlacement(0, -1, 0), FACING_NORTH);
});

test("a trapdoor built on a top or bottom face faces the player", () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    assert.equal(trapdoorFacingForPlacement(0, 0, yaw), facingForYaw(yaw), `yaw ${yaw}`);
  }
});

test("trapdoors take the same upper or lower half rule as slabs", () => {
  assert.equal(trapdoorTopForPlacement(1, 0), false, "on top of a block");
  assert.equal(trapdoorTopForPlacement(-1, 0), true, "under a block");
  assert.equal(trapdoorTopForPlacement(0, 0.25), true, "high on a side");
  assert.equal(trapdoorTopForPlacement(0, -0.25), false, "low on a side");
});
