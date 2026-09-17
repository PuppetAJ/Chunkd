import assert from "node:assert/strict";
import test from "node:test";

import { BLOCK_IDS } from "./blockIds.ts";
import { blockIdOf, SHAPE_SLAB_BOTTOM, SHAPE_STAIRS_BOTTOM } from "./blockValue.ts";
import { toKey } from "./coords.ts";
import { buildRenderLayers, computeVisible } from "./render.ts";
import { useWorldStore } from "./worldStore.ts";

const store = () => useWorldStore.getState();

/** A cell in the air above the middle of the world. */
function openCell(): [number, number, number] {
  const { size, blocks } = store();
  const x = Math.floor(size / 2);
  const z = Math.floor(size / 2);
  let y = 60;
  while (y > 0 && !blocks.has(toKey(x, y - 1, z))) y -= 1;
  return [x, y, z];
}

test("placing and removing a block changes the world and says so", () => {
  store().newWorld(4242);
  const [x, y, z] = openCell();
  const { revision, blocks } = store();
  assert.equal(store().edited, false);

  store().setHotbarBlock(1, BLOCK_IDS.stoneBricks);
  store().setSelectedSlot(1);
  store().placeBlock(x, y, z);
  assert.equal(blockIdOf(store().blocks.get(toKey(x, y, z)) ?? 0), BLOCK_IDS.stoneBricks);
  assert.equal(store().edited, true);
  assert.equal(store().revision, revision + 1);
  // The map is the same object, changed in place, so the revision is the signal.
  assert.equal(store().blocks, blocks);

  store().removeBlock(x, y, z);
  assert.equal(store().blocks.has(toKey(x, y, z)), false);
  assert.equal(store().revision, revision + 2);
});

test("placing into a filled cell or removing from an empty one changes nothing", () => {
  store().newWorld(4242);
  const [x, y, z] = openCell();
  const { revision } = store();
  store().removeBlock(x, y, z);
  store().placeBlock(x, y - 1, z);
  assert.equal(store().revision, revision);
  assert.equal(store().edited, false);
});

test("the drawn layers stay equal to grouping the world from scratch", () => {
  store().newWorld(7);
  const [x, y, z] = openCell();
  store().setHotbarBlock(1, BLOCK_IDS.stoneBricks);
  store().setSelectedSlot(1);
  for (let i = 0; i < 4; i += 1) store().placeBlocks([[x + i, y, z]], undefined, SHAPE_STAIRS_BOTTOM);
  store().placeBlocks([[x, y + 1, z]], undefined, SHAPE_SLAB_BOTTOM);
  store().removeBlocks([[x + 1, y, z], [x, y - 1, z]]);

  const summarise = (layers: ReturnType<typeof buildRenderLayers>) =>
    layers.map((layer) => `${layer.blockId}/${layer.shape}/${layer.variant}:${[...layer.positions].sort().join(",")}`);
  assert.deepEqual(summarise(store().layers), summarise(buildRenderLayers(store().blocks)));
  assert.equal(store().visible.size, computeVisible(store().blocks).size);
});

test("a saved world loads back as the same blocks", () => {
  store().newWorld(99);
  const [x, y, z] = openCell();
  store().setHotbarBlock(1, BLOCK_IDS.oakPlanks);
  store().setSelectedSlot(1);
  store().placeBlocks([[x, y, z], [x + 1, y, z]]);
  store().removeBlocks([[x, y - 1, z]]);
  const before = new Map(store().blocks);
  const payload = store().serialize();

  store().newWorld(1);
  assert.notDeepEqual(store().blocks, before);

  assert.equal(store().loadBuild(payload, { id: "abc", name: "Test" }), true);
  assert.deepEqual(store().blocks, before);
  assert.equal(store().seed, 99);
  assert.equal(store().edited, false);
  assert.equal(store().source?.name, "Test");
});

test("a payload that cannot be read is refused without touching the world", () => {
  store().newWorld(5);
  const { revision, seed } = store();
  assert.equal(store().loadBuild("not a world"), false);
  assert.equal(store().seed, seed);
  assert.equal(store().revision, revision);
});
