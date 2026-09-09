import assert from "node:assert/strict";
import test from "node:test";

import {
  FACING_EAST,
  FACING_NORTH,
  FACING_SOUTH,
  FACING_WEST,
  facingOffset,
} from "./voxel/blockValue.ts";
import { stairParts } from "./blockGeometry.ts";

/** The half of the cell a box covers on one axis, as -1, 0 or 1 for both. */
const side = (min: number, max: number) => (min === -0.5 && max === 0.5 ? 0 : min === -0.5 ? -1 : 1);

test("a stair's flat part fills the cell's footprint", () => {
  // This is the part that makes a stair's underside a whole face, which face
  // culling relies on to hide the block beneath it.
  for (const upsideDown of [false, true]) {
    for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
      const [flat] = stairParts(facing, upsideDown);
      assert.deepEqual([flat!.min[0], flat!.max[0]], [-0.5, 0.5], `facing ${facing}`);
      assert.deepEqual([flat!.min[2], flat!.max[2]], [-0.5, 0.5], `facing ${facing}`);
      assert.equal(flat!.max[1] - flat!.min[1], 0.5, `facing ${facing}`);
    }
  }
});

test("the tall part sits opposite the way the step faces", () => {
  // Facing is where the low step points, so the tall half is on the far side.
  // Getting this backwards would make every stair face the wrong way, which
  // is easy to do and hard to see in one screenshot.
  for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
    const [, step] = stairParts(facing, false);
    const [fx, fz] = facingOffset(facing);
    // Written out rather than negated: strict equality treats -0 and 0 as
    // different, and negating a zero offset produces -0.
    const opposite = (n: number) => (n === 0 ? 0 : -n);
    assert.equal(side(step!.min[0], step!.max[0]), opposite(fx), `facing ${facing} on x`);
    assert.equal(side(step!.min[2], step!.max[2]), opposite(fz), `facing ${facing} on z`);
  }
});

test("the tall part is half the cell across and half of it high", () => {
  for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
    const [, step] = stairParts(facing, false);
    const width = step!.max[0] - step!.min[0];
    const depth = step!.max[2] - step!.min[2];
    assert.equal(step!.max[1] - step!.min[1], 0.5);
    // One axis is halved and the other is whole, whichever way it faces.
    assert.deepEqual([width, depth].sort(), [0.5, 1]);
  }
});

test("upside down puts the flat part on top and the step below it", () => {
  const [flatUp, stepUp] = stairParts(FACING_NORTH, false);
  assert.deepEqual([flatUp!.min[1], flatUp!.max[1]], [-0.5, 0]);
  assert.deepEqual([stepUp!.min[1], stepUp!.max[1]], [0, 0.5]);

  const [flatDown, stepDown] = stairParts(FACING_NORTH, true);
  assert.deepEqual([flatDown!.min[1], flatDown!.max[1]], [0, 0.5]);
  assert.deepEqual([stepDown!.min[1], stepDown!.max[1]], [-0.5, 0]);
});

test("turning a stair upside down does not turn it round", () => {
  // The facing is horizontal, so it has to survive the flip untouched.
  for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
    const [, up] = stairParts(facing, false);
    const [, down] = stairParts(facing, true);
    assert.deepEqual([up!.min[0], up!.max[0]], [down!.min[0], down!.max[0]], `facing ${facing}`);
    assert.deepEqual([up!.min[2], up!.max[2]], [down!.min[2], down!.max[2]], `facing ${facing}`);
  }
});

test("every part stays inside its own cell", () => {
  for (const upsideDown of [false, true]) {
    for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
      for (const part of stairParts(facing, upsideDown)) {
        for (const axis of [0, 1, 2]) {
          assert.ok(part.min[axis]! >= -0.5, `min ${part.min[axis]}`);
          assert.ok(part.max[axis]! <= 0.5, `max ${part.max[axis]}`);
          assert.ok(part.max[axis]! > part.min[axis]!, "empty box");
        }
      }
    }
  }
});
