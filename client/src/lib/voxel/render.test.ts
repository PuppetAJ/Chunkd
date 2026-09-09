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
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
} from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { buildRenderLayers, computeVisible, refreshVisibleAround } from "./render.ts";
import { generateTerrain } from "./terrain.ts";

/** A 3x3x3 cube of one block type, centred on the origin. */
function solidCube(id: number): Map<BlockKey, number> {
  const blocks = new Map<BlockKey, number>();
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) blocks.set(toKey(x, y, z), id);
  return blocks;
}

function drawnPositions(blocks: Map<BlockKey, number>): Set<string> {
  const drawn = new Set<string>();
  for (const layer of buildRenderLayers(blocks)) {
    for (let i = 0; i < layer.positions.length; i += 3) {
      drawn.add(`${layer.positions[i]},${layer.positions[i + 1]},${layer.positions[i + 2]}`);
    }
  }
  return drawn;
}

test("a fully buried block is not drawn", () => {
  const drawn = drawnPositions(solidCube(BLOCK_IDS.dirt));
  assert.equal(drawn.has("0,0,0"), false);
  assert.equal(drawn.size, 26);
});

test("a lone block is drawn", () => {
  const blocks = new Map<BlockKey, number>([[toKey(0, 0, 0), BLOCK_IDS.dirt]]);
  assert.deepEqual([...drawnPositions(blocks)], ["0,0,0"]);
});

test("a block behind glass is still drawn", () => {
  // The centre block is buried, but one of the six neighbours is glass, so it
  // is visible through it and has to be drawn.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), BLOCK_IDS.glass);
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("a block behind leaves is still drawn", () => {
  // Faithful's leaves have gaps in them, so they do not hide what is behind.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), BLOCK_IDS.oakLeaves);
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("glass buried in solid blocks is not drawn", () => {
  // Being see-through says nothing about whether you can see the block itself.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 0, 0), BLOCK_IDS.glass);
  assert.equal(drawnPositions(blocks).has("0,0,0"), false);
});

test("layers come back sorted by block id", () => {
  const blocks = new Map<BlockKey, number>([
    [toKey(0, 0, 0), BLOCK_IDS.stoneBricks],
    [toKey(2, 0, 0), BLOCK_IDS.dirt],
    [toKey(4, 0, 0), BLOCK_IDS.glass],
  ]);
  const ids = buildRenderLayers(blocks).map((layer) => layer.blockId);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
});

test("updating around a change matches working the whole world out again", () => {
  // The visible set is now maintained as edits happen instead of being rebuilt,
  // which is only safe while the cheap path and the thorough one agree. This
  // plays out a long run of edits and checks they never diverge.
  const blocks = generateTerrain(4242, 24);
  const visible = computeVisible(blocks);

  // A tiny deterministic generator, so a failure is always reproducible.
  let state = 12345;
  const random = (limit: number) => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state % limit;
  };

  const placeable = [BLOCK_IDS.stone, BLOCK_IDS.glass, BLOCK_IDS.oakLog, BLOCK_IDS.sand];

  for (let step = 0; step < 400; step += 1) {
    const x = random(24);
    const y = random(20);
    const z = random(24);
    const key = toKey(x, y, z);

    if (blocks.has(key) && random(2) === 0) blocks.delete(key);
    else blocks.set(key, placeable[random(placeable.length)]!);

    refreshVisibleAround(blocks, visible, x, y, z);

    if (step % 40 === 0) {
      const thorough = computeVisible(blocks);
      assert.deepEqual(
        [...visible.keys()].sort(),
        [...thorough.keys()].sort(),
        `visible set drifted at step ${step}`,
      );
    }
  }

  const thorough = computeVisible(blocks);
  assert.deepEqual([...visible.keys()].sort(), [...thorough.keys()].sort());
  assert.deepEqual(
    [...visible.entries()].sort(),
    [...thorough.entries()].sort(),
    "the values must match too, not just which blocks are visible",
  );
});

test("a slab does not hide the block underneath it", () => {
  // The reason face culling had to learn about shapes at all. A slab covers
  // half of each side face, and half covered is not covered, so treating it as
  // an occluder left see-through holes wherever a slab floor met the terrain.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_TOP));
  const drawn = drawnPositions(blocks);
  assert.equal(drawn.has("0,0,0"), true);
});

test("a slab flush against a face still hides what is behind that face", () => {
  // The other half of the rule. A bottom slab fills its cell's underside
  // exactly, so the block below it is covered and there is no reason to draw
  // it. Getting this wrong would cost the saving that culling exists for.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM));
  assert.equal(drawnPositions(blocks).has("0,0,0"), false);
});

test("a slab is always drawn, however buried", () => {
  // A bottom slab's top surface is inside its own cell, so no neighbour can
  // cover it and it can never be culled.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM));
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("cubes and slabs of one block are drawn as separate layers", () => {
  // Every instance in a mesh shares one geometry, so a cube and a slab of the
  // same stone cannot be in the same layer.
  const blocks = new Map<BlockKey, number>([
    [toKey(0, 0, 0), packBlock(BLOCK_IDS.stone)],
    [toKey(2, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM)],
    [toKey(4, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_TOP)],
  ]);

  const layers = buildRenderLayers(blocks);
  assert.equal(layers.length, 3);
  assert.deepEqual(layers.map((layer) => layer.blockId), [BLOCK_IDS.stone, BLOCK_IDS.stone, BLOCK_IDS.stone]);
  assert.deepEqual(layers.map((layer) => layer.shape), [SHAPE_FULL, SHAPE_SLAB_BOTTOM, SHAPE_SLAB_TOP]);
});

test("updating around a slab matches working the whole world out again", () => {
  // The incremental path and the from-scratch path have to agree, and the
  // shape rules are new enough to be worth checking on both.
  const blocks = solidCube(BLOCK_IDS.dirt);
  const visible = computeVisible(blocks);

  blocks.set(toKey(0, 2, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM));
  refreshVisibleAround(blocks, visible, 0, 2, 0);

  assert.deepEqual([...visible.keys()].sort(), [...computeVisible(blocks).keys()].sort());
});

test("a stair hides the block its flat half sits on", () => {
  // A bottom stair's underside is a whole face, like a bottom slab's.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH));
  assert.equal(drawnPositions(blocks).has("0,0,0"), false);
});

test("a stair does not hide the block its step half is missing from", () => {
  // An upside-down stair's underside is notched, so the block below shows
  // through the gap and still has to be drawn.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_TOP, FACING_NORTH));
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("a stair hides the neighbour on its tall side and not the one in front", () => {
  // The rule that needed the horizontal direction as well as the vertical. A
  // stair's tall half is opposite its facing, so it covers the neighbour it
  // faces away from. Put a stair to the north facing north and its tall half
  // is on its south side, against the block at the origin.
  const behind = solidCube(BLOCK_IDS.dirt);
  behind.set(toKey(0, 0, -1), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH));
  assert.equal(drawnPositions(behind).has("0,0,0"), false, "the tall side covers the whole face");

  // The same stair to the south presents its low step instead, which covers
  // half the face and so hides nothing.
  const infront = solidCube(BLOCK_IDS.dirt);
  infront.set(toKey(0, 0, 1), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH));
  assert.equal(drawnPositions(infront).has("0,0,0"), true, "the low side covers only half");
});

test("a stair's own facing decides which side it covers", () => {
  // Turning the stair round moves which neighbour it hides, so the rule has to
  // read the stair's facing rather than assume one. The neighbour it covers is
  // the one lying in the direction its low step points.
  for (const [facing, at] of [
    [FACING_NORTH, [0, 0, -1]],
    [FACING_SOUTH, [0, 0, 1]],
    [FACING_EAST, [1, 0, 0]],
    [FACING_WEST, [-1, 0, 0]],
  ] as [number, [number, number, number]][]) {
    const [dx, dy, dz] = at;
    const covered = solidCube(BLOCK_IDS.dirt);
    covered.set(toKey(dx, dy, dz), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, facing));
    assert.equal(
      drawnPositions(covered).has("0,0,0"),
      false,
      `a stair at ${at.join(",")} facing ${facing} should cover the origin`,
    );

    // And the opposite neighbour, which sees the low step, should not.
    const open = solidCube(BLOCK_IDS.dirt);
    open.set(toKey(-dx, dy, -dz), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, facing));
    assert.equal(
      drawnPositions(open).has("0,0,0"),
      true,
      `a stair at ${[-dx, dy, -dz].join(",")} facing ${facing} should not cover the origin`,
    );
  }
});

test("a stair is always drawn, however buried", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH));
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("stairs of one block facing different ways are separate layers", () => {
  // A facing is baked into its geometry rather than rotated per instance, so
  // each one is its own mesh.
  const blocks = new Map<BlockKey, number>([
    [toKey(0, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH)],
    [toKey(2, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_EAST)],
    [toKey(4, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH)],
  ]);

  const layers = buildRenderLayers(blocks);
  assert.equal(layers.length, 2, "two facings, two meshes");
  const north = layers.find((layer) => layer.facing === FACING_NORTH);
  assert.equal(north?.positions.length, 6, "both north stairs in one mesh");
});
