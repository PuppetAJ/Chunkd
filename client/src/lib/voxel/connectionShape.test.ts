import assert from "node:assert/strict";
import test from "node:test";

import { BLOCK_IDS } from "./blockIds.ts";
import {
  AXIS_Y,
  FACING_NORTH,
  packBlock,
  SHAPE_FENCE,
  SHAPE_SLAB_BOTTOM,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_WALL,
} from "./blockValue.ts";
import {
  connectionMask,
  SIDE_EAST,
  SIDE_NORTH,
  SIDE_SOUTH,
  SIDE_WEST,
  wallHasPost,
} from "./connectionShape.ts";
import { toKey, type BlockKey } from "./coords.ts";

const FENCE = packBlock(BLOCK_IDS.oakPlanks, AXIS_Y, SHAPE_FENCE);
const WALL = packBlock(BLOCK_IDS.cobblestone, AXIS_Y, SHAPE_WALL);
const STONE = packBlock(BLOCK_IDS.stone);

function world(entries: [number, number, number, number][]): Map<BlockKey, number> {
  return new Map(entries.map(([x, y, z, value]) => [toKey(x, y, z), value]));
}

function post(blocks: Map<BlockKey, number>, x: number, y: number, z: number): boolean {
  return wallHasPost(blocks, x, y, z, connectionMask(blocks, x, y, z));
}

test("a lone fence joins nothing", () => {
  assert.equal(connectionMask(world([[0, 0, 0, FENCE]]), 0, 0, 0), 0);
});

test("a fence joins fences on every side", () => {
  const blocks = world([
    [0, 0, 0, FENCE],
    [0, 0, -1, FENCE],
    [1, 0, 0, FENCE],
    [0, 0, 1, FENCE],
    [-1, 0, 0, FENCE],
  ]);
  assert.equal(connectionMask(blocks, 0, 0, 0), SIDE_NORTH | SIDE_EAST | SIDE_SOUTH | SIDE_WEST);
});

test("a fence joins a whole solid block", () => {
  assert.equal(connectionMask(world([[0, 0, 0, FENCE], [1, 0, 0, STONE]]), 0, 0, 0), SIDE_EAST);
});

test("a fence and a wall do not join each other", () => {
  const blocks = world([[0, 0, 0, FENCE], [1, 0, 0, WALL]]);
  assert.equal(connectionMask(blocks, 0, 0, 0), 0);
  assert.equal(connectionMask(blocks, 1, 0, 0), 0);
});

test("fences and walls join glass", () => {
  // Mojang closed the report of this as working as intended (MC-147798).
  const glass = packBlock(BLOCK_IDS.glass);
  assert.equal(connectionMask(world([[0, 0, 0, FENCE], [1, 0, 0, glass]]), 0, 0, 0), SIDE_EAST);
  assert.equal(connectionMask(world([[0, 0, 0, WALL], [1, 0, 0, glass]]), 0, 0, 0), SIDE_EAST);
});

test("neither a fence nor a wall joins leaves or a slab", () => {
  for (const neighbour of [
    packBlock(BLOCK_IDS.oakLeaves),
    packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM),
  ]) {
    const fence = world([[0, 0, 0, FENCE], [1, 0, 0, neighbour]]);
    const wall = world([[0, 0, 0, WALL], [1, 0, 0, neighbour]]);
    assert.equal(connectionMask(fence, 0, 0, 0), 0, `fence beside ${neighbour}`);
    assert.equal(connectionMask(wall, 0, 0, 0), 0, `wall beside ${neighbour}`);
  }
});

test("a block above or below is not a join", () => {
  const blocks = world([[0, 0, 0, FENCE], [0, 1, 0, FENCE], [0, -1, 0, STONE]]);
  assert.equal(connectionMask(blocks, 0, 0, 0), 0);
});

test("a wall has a post at its end and at a corner", () => {
  assert.equal(post(world([[0, 0, 0, WALL], [1, 0, 0, WALL]]), 0, 0, 0), true);
  assert.equal(post(world([[0, 0, 0, WALL], [1, 0, 0, WALL], [0, 0, 1, WALL]]), 0, 0, 0), true);
});

test("a wall has no post on a straight run or at a crossing", () => {
  // The wiki's rule: joined on exactly two opposite sides, or on all four.
  const straight = world([[0, 0, 0, WALL], [1, 0, 0, WALL], [-1, 0, 0, WALL]]);
  assert.equal(post(straight, 0, 0, 0), false);
  const crossing = world([
    [0, 0, 0, WALL],
    [1, 0, 0, WALL],
    [-1, 0, 0, WALL],
    [0, 0, 1, WALL],
    [0, 0, -1, WALL],
  ]);
  assert.equal(post(crossing, 0, 0, 0), false);
});

test("a T junction keeps its post", () => {
  const tee = world([[0, 0, 0, WALL], [1, 0, 0, WALL], [-1, 0, 0, WALL], [0, 0, 1, WALL]]);
  assert.equal(post(tee, 0, 0, 0), true);
});

test("a wall stacked on a straight run gives it a post", () => {
  const blocks = world([[0, 0, 0, WALL], [1, 0, 0, WALL], [-1, 0, 0, WALL], [0, 1, 0, WALL]]);
  assert.equal(post(blocks, 0, 0, 0), true);
});

const PANE = packBlock(BLOCK_IDS.glassPane);

test("a lone glass pane joins nothing", () => {
  assert.equal(connectionMask(world([[0, 0, 0, PANE]]), 0, 0, 0), 0);
});

test("a pane joins panes, walls, whole solid blocks and glass", () => {
  const blocks = world([
    [0, 0, 0, PANE],
    [0, 0, -1, PANE],
    [1, 0, 0, WALL],
    [0, 0, 1, STONE],
    [-1, 0, 0, packBlock(BLOCK_IDS.glass)],
  ]);
  assert.equal(connectionMask(blocks, 0, 0, 0), SIDE_NORTH | SIDE_EAST | SIDE_SOUTH | SIDE_WEST);
});

test("a pane does not join a fence, leaves or a slab", () => {
  for (const neighbour of [
    FENCE,
    packBlock(BLOCK_IDS.oakLeaves),
    packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM),
  ]) {
    assert.equal(connectionMask(world([[0, 0, 0, PANE], [1, 0, 0, neighbour]]), 0, 0, 0), 0, `beside ${neighbour}`);
  }
});

test("a pane joins the solid back of a stair but not its step", () => {
  // Facing north, a stair's tall half is on its south side.
  const stair = packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH);
  assert.equal(connectionMask(world([[0, 0, 0, stair], [0, 0, 1, PANE]]), 0, 0, 1), SIDE_NORTH);
  assert.equal(connectionMask(world([[0, 0, 0, stair], [0, 0, -1, PANE]]), 0, 0, -1), 0);
});

test("a wall joins a pane, and a fence does not", () => {
  assert.equal(connectionMask(world([[0, 0, 0, WALL], [1, 0, 0, PANE]]), 0, 0, 0), SIDE_EAST);
  assert.equal(connectionMask(world([[0, 0, 0, FENCE], [1, 0, 0, PANE]]), 0, 0, 0), 0);
});
