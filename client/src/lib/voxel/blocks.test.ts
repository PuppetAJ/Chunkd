import assert from "node:assert/strict";
import test from "node:test";

// blocks.ts imports textures, which Node cannot load, so the eligibility sets
// live in blockIds.ts and this tests them there.
import { existsSync } from "node:fs";
import {
  BLOCK_IDS,
  FENCE_BLOCK_IDS,
  PANE_BLOCK_IDS,
  SEE_THROUGH_BLOCK_IDS,
  SLAB_BLOCK_IDS,
  STAIR_BLOCK_IDS,
  TRAPDOOR_BLOCK_IDS,
  WALL_BLOCK_IDS,
} from "./blockIds.ts";

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

test("the blocks that can be fences are the ones Minecraft gives fences to", () => {
  assert.deepEqual([...FENCE_BLOCK_IDS].map(nameOf).sort(), [
    "birchPlanks",
    "cherryPlanks",
    "oakPlanks",
    "sprucePlanks",
  ]);
});

test("the blocks that can be trapdoors are the ones Minecraft gives trapdoors to", () => {
  assert.deepEqual([...TRAPDOOR_BLOCK_IDS].map(nameOf).sort(), [
    "birchPlanks",
    "cherryPlanks",
    "oakPlanks",
    "sprucePlanks",
  ]);
});

test("the blocks that can be walls are the ones Minecraft gives walls to", () => {
  // From the wiki's list. There is no wall of plain stone, cut or chiseled
  // sandstone, or polished granite, diorite or andesite, and Minecraft's
  // deepslate wall is of cobbled deepslate, which is not in our table.
  const expected = [
    "cobblestone", "mossyCobblestone", "stoneBricks", "granite", "diorite", "andesite",
    "tuff", "blackstone", "deepslateTiles", "bricks", "mudBricks", "sandstone",
  ];
  assert.deepEqual([...WALL_BLOCK_IDS].map(nameOf).sort(), expected.sort());
});

test("every block with a trapdoor has its trapdoor texture", () => {
  // blocks.ts cannot be loaded here, so this checks the files themselves.
  for (const id of TRAPDOOR_BLOCK_IDS) {
    const wood = nameOf(id).replace("Planks", "");
    const file = new URL(`../../assets/textures/${wood}_trapdoor.png`, import.meta.url);
    assert.ok(existsSync(file), `missing ${wood}_trapdoor.png`);
  }
});

test("the glass pane is the only pane, and it can be seen through", () => {
  assert.deepEqual([...PANE_BLOCK_IDS].map(nameOf), ["glassPane"]);
  assert.ok(SEE_THROUGH_BLOCK_IDS.has(BLOCK_IDS.glassPane));
});

test("the glass pane's edge texture is there", () => {
  assert.ok(existsSync(new URL("../../assets/textures/glass_pane_top.png", import.meta.url)));
});
