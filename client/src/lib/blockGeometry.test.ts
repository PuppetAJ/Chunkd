import assert from "node:assert/strict";
import test from "node:test";

import { FACING_EAST, FACING_NORTH, FACING_SOUTH, FACING_WEST } from "./voxel/blockValue.ts";
import { straightQuadrants } from "./voxel/stairShape.ts";
import { stairParts } from "./blockGeometry.ts";

const volume = (part: { min: [number, number, number]; max: [number, number, number] }) =>
  (part.max[0] - part.min[0]) * (part.max[1] - part.min[1]) * (part.max[2] - part.min[2]);

test("a stair's flat part fills the cell's footprint", () => {
  // This is what makes a stair's outer face whole, which face culling relies
  // on to hide the block beneath it.
  for (const upsideDown of [false, true]) {
    const [flat] = stairParts(straightQuadrants(FACING_NORTH), upsideDown);
    assert.deepEqual([flat!.min[0], flat!.max[0]], [-0.5, 0.5]);
    assert.deepEqual([flat!.min[2], flat!.max[2]], [-0.5, 0.5]);
    assert.equal(flat!.max[1] - flat!.min[1], 0.5);
  }
});

test("a straight stair is three quarters of a block", () => {
  // Half for the flat part, plus two quarters of the other half.
  for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
    const parts = stairParts(straightQuadrants(facing), false);
    assert.equal(parts.length, 3, `facing ${facing}`);
    const total = parts.reduce((sum, part) => sum + volume(part), 0);
    assert.ok(Math.abs(total - 0.75) < 1e-9, `facing ${facing} came to ${total}`);
  }
});

test("a corner has one quarter fewer or one more than a straight run", () => {
  const outer = stairParts(1, false);
  const inner = stairParts(0b1011, false);
  assert.equal(outer.length, 2, "flat half plus one quarter");
  assert.equal(inner.length, 4, "flat half plus three");
  assert.ok(Math.abs(outer.reduce((s, p) => s + volume(p), 0) - 0.625) < 1e-9);
  assert.ok(Math.abs(inner.reduce((s, p) => s + volume(p), 0) - 0.875) < 1e-9);
});

test("upside down puts the flat part on top and the quarters below it", () => {
  const mask = straightQuadrants(FACING_NORTH);
  const [flatUp, ...stepsUp] = stairParts(mask, false);
  assert.deepEqual([flatUp!.min[1], flatUp!.max[1]], [-0.5, 0]);
  for (const step of stepsUp) assert.deepEqual([step.min[1], step.max[1]], [0, 0.5]);

  const [flatDown, ...stepsDown] = stairParts(mask, true);
  assert.deepEqual([flatDown!.min[1], flatDown!.max[1]], [0, 0.5]);
  for (const step of stepsDown) assert.deepEqual([step.min[1], step.max[1]], [-0.5, 0]);
});

test("turning a stair upside down does not turn it round", () => {
  // The quarters are horizontal, so they have to survive the flip untouched.
  for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
    const mask = straightQuadrants(facing);
    const up = stairParts(mask, false).slice(1);
    const down = stairParts(mask, true).slice(1);
    for (let i = 0; i < up.length; i += 1) {
      assert.deepEqual([up[i]!.min[0], up[i]!.max[0]], [down[i]!.min[0], down[i]!.max[0]]);
      assert.deepEqual([up[i]!.min[2], up[i]!.max[2]], [down[i]!.min[2], down[i]!.max[2]]);
    }
  }
});

test("every part stays inside its own cell", () => {
  for (const upsideDown of [false, true]) {
    for (let mask = 0; mask < 16; mask += 1) {
      for (const part of stairParts(mask, upsideDown)) {
        for (const axis of [0, 1, 2]) {
          assert.ok(part.min[axis]! >= -0.5, `min ${part.min[axis]}`);
          assert.ok(part.max[axis]! <= 0.5, `max ${part.max[axis]}`);
          assert.ok(part.max[axis]! > part.min[axis]!, "empty box");
        }
      }
    }
  }
});
