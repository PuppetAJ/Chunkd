import assert from "node:assert/strict";
import test from "node:test";

import { BLOCK_IDS } from "./blockIds.ts";
import {
  AXIS_Y,
  packBlock,
  FACING_EAST,
  FACING_NORTH,
  FACING_SOUTH,
  FACING_WEST,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
} from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { stairQuadrants, straightQuadrants } from "./stairShape.ts";

const stair = (facing: number, upsideDown = false) =>
  packBlock(
    BLOCK_IDS.stoneBricks,
    AXIS_Y,
    upsideDown ? SHAPE_STAIRS_TOP : SHAPE_STAIRS_BOTTOM,
    facing,
  );

/** How many quarters of the tall half are filled. */
const filled = (mask: number) => [0, 1, 2, 3].filter((i) => mask & (1 << i)).length;

const world = (entries: [number, number, number, number][]) => {
  const blocks = new Map<BlockKey, number>();
  for (const [x, y, z, value] of entries) blocks.set(toKey(x, y, z), value);
  return blocks;
};

test("a stair on its own is straight", () => {
  for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
    const blocks = world([[0, 0, 0, stair(facing)]]);
    assert.equal(stairQuadrants(blocks, 0, 0, 0), straightQuadrants(facing), `facing ${facing}`);
    assert.equal(filled(straightQuadrants(facing)), 2, `facing ${facing}`);
  }
});

test("a straight run stays straight", () => {
  // Stairs in line with each other continue, they do not turn.
  const blocks = world([
    [0, 0, 0, stair(FACING_NORTH)],
    [0, 0, 1, stair(FACING_NORTH)],
    [0, 0, -1, stair(FACING_NORTH)],
  ]);
  assert.equal(stairQuadrants(blocks, 0, 0, 0), straightQuadrants(FACING_NORTH));
});

test("a turn against the tall side makes an outer corner", () => {
  // One quarter left, on the outside of the turn.
  const blocks = world([
    [0, 0, 0, stair(FACING_NORTH)],
    [0, 0, 1, stair(FACING_EAST)],
  ]);
  const mask = stairQuadrants(blocks, 0, 0, 0);
  assert.equal(filled(mask), 1, `mask ${mask.toString(2)}`);
  assert.notEqual(mask, straightQuadrants(FACING_NORTH));
});

test("a turn against the low side makes an inner corner", () => {
  // Three quarters, wrapping the inside of the turn.
  const blocks = world([
    [0, 0, 0, stair(FACING_NORTH)],
    [0, 0, -1, stair(FACING_EAST)],
  ]);
  const mask = stairQuadrants(blocks, 0, 0, 0);
  assert.equal(filled(mask), 3, `mask ${mask.toString(2)}`);
  // An inner corner keeps everything the straight one had and adds to it.
  assert.equal(mask & straightQuadrants(FACING_NORTH), straightQuadrants(FACING_NORTH));
});

test("a corner is made of quarters the neighbour's own shape reaches", () => {
  // The two shapes have to meet, or the turn has a gap in it. The quarter an
  // outer corner keeps must be one the neighbour also fills on its side.
  const blocks = world([
    [0, 0, 0, stair(FACING_NORTH)],
    [0, 0, 1, stair(FACING_EAST)],
  ]);
  const here = stairQuadrants(blocks, 0, 0, 0);
  const next = stairQuadrants(blocks, 0, 0, 1);
  // Both are on the west side of their cells, so the walls line up.
  const westQuarters = (1 << 0) | (1 << 2);
  assert.ok((here & westQuarters) !== 0, `here ${here.toString(2)}`);
  assert.ok((next & westQuarters) !== 0, `next ${next.toString(2)}`);
});

test("stairs in different halves of their cells do not turn together", () => {
  // An upside-down stair beside an upright one is not a corner: they are not
  // at the same height and joining them would look wrong.
  const blocks = world([
    [0, 0, 0, stair(FACING_NORTH)],
    [0, 0, 1, stair(FACING_EAST, true)],
  ]);
  assert.equal(stairQuadrants(blocks, 0, 0, 0), straightQuadrants(FACING_NORTH));
});

test("an upside-down turn works the same way as an upright one", () => {
  const upright = world([
    [0, 0, 0, stair(FACING_NORTH)],
    [0, 0, 1, stair(FACING_EAST)],
  ]);
  const inverted = world([
    [0, 0, 0, stair(FACING_NORTH, true)],
    [0, 0, 1, stair(FACING_EAST, true)],
  ]);
  assert.equal(stairQuadrants(inverted, 0, 0, 0), stairQuadrants(upright, 0, 0, 0));
});

test("a whole block beside a stair changes nothing", () => {
  const blocks = world([
    [0, 0, 0, stair(FACING_NORTH)],
    [0, 0, 1, packBlock(BLOCK_IDS.stone)],
    [0, 0, -1, packBlock(BLOCK_IDS.stone)],
  ]);
  assert.equal(stairQuadrants(blocks, 0, 0, 0), straightQuadrants(FACING_NORTH));
});

test("anything that is not a stair has no quarters", () => {
  const blocks = world([[0, 0, 0, packBlock(BLOCK_IDS.stone)]]);
  assert.equal(stairQuadrants(blocks, 0, 0, 0), 0);
  assert.equal(stairQuadrants(blocks, 5, 5, 5), 0);
});
