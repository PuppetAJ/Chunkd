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
  packBlock,
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
