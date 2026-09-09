import assert from "node:assert/strict";
import test from "node:test";

// blocks.ts imports textures, which Node cannot load, so the eligibility sets
// live in blockIds.ts and this tests them there.
import { BLOCK_IDS, SLAB_BLOCK_IDS, STAIR_BLOCK_IDS } from "./blockIds.ts";

const nameOf = (id: number) =>
  Object.entries(BLOCK_IDS).find(([, value]) => value === id)?.[0] ?? String(id);

test("the blocks that can be slabs are the ones Minecraft gives slabs to", () => {
  const expected = [
    "stone", "cobblestone", "mossyCobblestone", "granite", "diorite", "andesite",
    "tuff", "blackstone", "stoneBricks", "bricks", "mudBricks", "sandstone",
    "cutSandstone", "polishedGranite", "polishedDiorite", "polishedAndesite",
    "deepslateTiles", "oakPlanks", "sprucePlanks", "birchPlanks", "cherryPlanks",
  ];
  assert.deepEqual([...SLAB_BLOCK_IDS].map(nameOf).sort(), expected.sort());
});

test("cut sandstone has a slab but no stairs", () => {
  // The one block where the two sets differ, which is why there are two.
  assert.equal(SLAB_BLOCK_IDS.has(BLOCK_IDS.cutSandstone), true);
  assert.equal(STAIR_BLOCK_IDS.has(BLOCK_IDS.cutSandstone), false);
});

test("anything that can be stairs can also be a slab", () => {
  // True in Minecraft, and the shape picker assumes it: it steps from whole
  // block to slab to stairs.
  for (const id of STAIR_BLOCK_IDS) {
    assert.equal(SLAB_BLOCK_IDS.has(id), true, `${nameOf(id)} has stairs but no slab`);
  }
});

test("blocks the game does not cut are excluded", () => {
  // Logs, leaves, glass and the loose ground blocks have no slab in Minecraft.
  // Plain deepslate and basalt have none either: only their cobbled, polished
  // and brick variants do, and of those we carry only deepslate tiles.
  const excluded = [
    BLOCK_IDS.oakLog, BLOCK_IDS.spruceLog, BLOCK_IDS.birchLog, BLOCK_IDS.cherryLog,
    BLOCK_IDS.hayBale, BLOCK_IDS.grass, BLOCK_IDS.dirt, BLOCK_IDS.sand,
    BLOCK_IDS.gravel, BLOCK_IDS.glass, BLOCK_IDS.oakLeaves, BLOCK_IDS.snow,
    BLOCK_IDS.deepslate, BLOCK_IDS.basalt, BLOCK_IDS.obsidian, BLOCK_IDS.endStone,
    BLOCK_IDS.calcite, BLOCK_IDS.amethyst, BLOCK_IDS.dripstone,
    BLOCK_IDS.chiseledSandstone, BLOCK_IDS.farmland, BLOCK_IDS.blueIce,
  ];
  for (const id of excluded) {
    assert.equal(SLAB_BLOCK_IDS.has(id), false, `${nameOf(id)} should have no slab`);
    assert.equal(STAIR_BLOCK_IDS.has(id), false, `${nameOf(id)} should have no stairs`);
  }
});

test("every eligible id is a real block", () => {
  // Annotated as numbers: BLOCK_IDS is a const object, so Object.values gives
  // a union of the literal ids and the set would only accept those.
  const ids: Set<number> = new Set(Object.values(BLOCK_IDS));
  for (const id of SLAB_BLOCK_IDS) assert.equal(ids.has(id), true, `unknown id ${id}`);
});
