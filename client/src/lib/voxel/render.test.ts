import assert from "node:assert/strict";
import test from "node:test";

import { BLOCK_IDS } from "./blockIds.ts";
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

test("leaves are opaque in this texture set, so they do hide what is behind", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), BLOCK_IDS.oakLeaves);
  assert.equal(drawnPositions(blocks).has("0,0,0"), false);
});

test("glass buried in solid blocks is not drawn", () => {
  // Being see-through says nothing about whether you can see the block itself.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 0, 0), BLOCK_IDS.glass);
  assert.equal(drawnPositions(blocks).has("0,0,0"), false);
});

test("layers come back sorted by block id", () => {
  const blocks = new Map<BlockKey, number>([
    [toKey(0, 0, 0), BLOCK_IDS.cobblestoneBricks],
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
