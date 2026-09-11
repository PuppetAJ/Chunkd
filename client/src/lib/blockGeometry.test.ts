import assert from "node:assert/strict";
import test from "node:test";

import {
  FACING_EAST,
  FACING_NORTH,
  FACING_SOUTH,
  FACING_WEST,
  TRAPDOOR_THICKNESS,
  TRAPDOOR_VARIANT_OPEN,
  TRAPDOOR_VARIANT_TOP,
} from "./voxel/blockValue.ts";
import { SIDE_EAST, SIDE_NORTH, SIDE_SOUTH, SIDE_WEST, WALL_POST_BIT } from "./voxel/connectionShape.ts";
import { straightQuadrants } from "./voxel/stairShape.ts";
import { fenceParts, paneParts, stairParts, trapdoorParts, wallParts } from "./blockGeometry.ts";

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

test("a fence on its own is just its post", () => {
  // Minecraft's post is six to ten sixteenths across, centred.
  assert.deepEqual(fenceParts(0), [{ min: [-0.125, -0.5, -0.125], max: [0.125, 0.5, 0.125] }]);
});

test("a fence has two rails to each side it joins", () => {
  assert.equal(fenceParts(SIDE_EAST | SIDE_WEST).length, 1 + 2 * 2);
  assert.equal(fenceParts(SIDE_NORTH | SIDE_EAST | SIDE_SOUTH | SIDE_WEST).length, 1 + 4 * 2);
});

test("a fence's rails reach the edge of the cell they join towards", () => {
  for (const rail of fenceParts(SIDE_EAST).slice(1)) assert.equal(rail.max[0], 0.5);
});

test("a straight wall with no post is its two sides meeting in the middle", () => {
  const parts = wallParts(SIDE_EAST | SIDE_WEST);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts.map((part) => [part.min[0], part.max[0]]).sort(), [
    [-0.5, 0],
    [0, 0.5],
  ]);
});

test("a wall with a post includes it", () => {
  assert.equal(wallParts(SIDE_EAST | WALL_POST_BIT).length, 2);
});

test("a shut trapdoor is a thin panel across its half of the cell", () => {
  assert.deepEqual(trapdoorParts(0), [
    { min: [-0.5, -0.5, -0.5], max: [0.5, -0.5 + TRAPDOOR_THICKNESS, 0.5] },
  ]);
  assert.deepEqual(trapdoorParts(TRAPDOOR_VARIANT_TOP), [
    { min: [-0.5, 0.5 - TRAPDOOR_THICKNESS, -0.5], max: [0.5, 0.5, 0.5] },
  ]);
});

test("an open trapdoor stands against the side it faces away from", () => {
  // That side is its hinge: facing north, it opens against the south edge. The
  // middle value is which corner coordinate to read, 0 for x or 2 for z, typed
  // as exactly those two so reading it is known to stay inside the three.
  const cases: [number, 0 | 2, number][] = [
    [FACING_NORTH, 2, 0.5],
    [FACING_SOUTH, 2, -0.5],
    [FACING_EAST, 0, -0.5],
    [FACING_WEST, 0, 0.5],
  ];
  for (const [facing, axis, edge] of cases) {
    const [panel] = trapdoorParts(facing | TRAPDOOR_VARIANT_OPEN);
    const touches = edge > 0 ? panel!.max[axis] === 0.5 : panel!.min[axis] === -0.5;
    assert.ok(touches, `facing ${facing} should touch its hinge edge`);
    assert.equal(panel!.max[axis] - panel!.min[axis], TRAPDOOR_THICKNESS, `facing ${facing} thickness`);
    assert.equal(panel!.max[1] - panel!.min[1], 1, `facing ${facing} should stand a block tall`);
  }
});

test("a lone glass pane is a post two sixteenths across and a block tall", () => {
  assert.deepEqual(paneParts(0), [{ min: [-0.0625, -0.5, -0.0625], max: [0.0625, 0.5, 0.0625] }]);
});

test("a glass pane reaches the edge of its cell on each side it joins", () => {
  const parts = paneParts(SIDE_EAST | SIDE_WEST);
  assert.equal(parts.length, 3);
  assert.ok(parts.some((part) => part.max[0] === 0.5), "should reach the east edge");
  assert.ok(parts.some((part) => part.min[0] === -0.5), "should reach the west edge");
});
