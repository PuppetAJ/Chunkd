import assert from "node:assert/strict";
import test from "node:test";

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
    "darkOakPlanks", "acaciaPlanks", "junglePlanks", "mossyStoneBricks", "quartz",
    "deepslateBricks", "polishedDeepslate", "smoothSandstone", "oxidizedCutCopper",
  ];
  assert.deepEqual([...SLAB_BLOCK_IDS].map(nameOf).sort(), expected.sort());
});

test("cut sandstone has a slab but no stairs", () => {
  assert.equal(SLAB_BLOCK_IDS.has(BLOCK_IDS.cutSandstone), true);
  assert.equal(STAIR_BLOCK_IDS.has(BLOCK_IDS.cutSandstone), false);
});

test("anything that can be stairs can also be a slab", () => {
  for (const id of STAIR_BLOCK_IDS) {
    assert.equal(SLAB_BLOCK_IDS.has(id), true, `${nameOf(id)} has stairs but no slab`);
  }
});

test("blocks the game does not cut are excluded", () => {
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
  const ids: Set<number> = new Set(Object.values(BLOCK_IDS));
  for (const id of SLAB_BLOCK_IDS) assert.equal(ids.has(id), true, `unknown id ${id}`);
});

test("the blocks that can be fences are the ones Minecraft gives fences to", () => {
  assert.deepEqual([...FENCE_BLOCK_IDS].map(nameOf).sort(), [
    "acaciaPlanks",
    "birchPlanks",
    "cherryPlanks",
    "darkOakPlanks",
    "junglePlanks",
    "oakPlanks",
    "sprucePlanks",
  ]);
});

test("the blocks that can be trapdoors are the ones Minecraft gives trapdoors to", () => {
  assert.deepEqual([...TRAPDOOR_BLOCK_IDS].map(nameOf).sort(), [
    "acaciaPlanks",
    "birchPlanks",
    "cherryPlanks",
    "darkOakPlanks",
    "junglePlanks",
    "oakPlanks",
    "sprucePlanks",
  ]);
});

test("the blocks that can be walls are the ones Minecraft gives walls to", () => {
  const expected = [
    "cobblestone", "mossyCobblestone", "stoneBricks", "granite", "diorite", "andesite",
    "tuff", "blackstone", "deepslateTiles", "bricks", "mudBricks", "sandstone",
    "mossyStoneBricks", "deepslateBricks", "polishedDeepslate",
  ];
  assert.deepEqual([...WALL_BLOCK_IDS].map(nameOf).sort(), expected.sort());
});

test("every block with a trapdoor has its trapdoor texture", () => {
  for (const id of TRAPDOOR_BLOCK_IDS) {
    const wood = nameOf(id).replace("Planks", "").replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
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

test("saved builds keep meaning the same blocks: no id is renumbered or reused", () => {
  const saved = {
    dirt: 1, grass: 2, glass: 3, cobblestone: 4, oakLog: 5, oakPlanks: 6, oakLeaves: 7,
    mudBricks: 8, stoneBricks: 9, sand: 10, gravel: 11, mud: 12, packedMud: 13, farmland: 14,
    snow: 15, snowyGrass: 16, blueIce: 17, stone: 18, granite: 19, diorite: 20, andesite: 21,
    calcite: 22, deepslate: 23, basalt: 24, obsidian: 25, amethyst: 26, tuff: 27, dripstone: 28,
    blackstone: 29, endStone: 30, mossyCobblestone: 31, sandstone: 32, cutSandstone: 33,
    chiseledSandstone: 34, polishedGranite: 35, polishedAndesite: 36, bricks: 37,
    polishedDiorite: 38, deepslateTiles: 39, spruceLog: 40, sprucePlanks: 41, spruceLeaves: 42,
    birchLog: 43, birchPlanks: 44, birchLeaves: 45, cherryLog: 46, cherryPlanks: 47,
    cherryLeaves: 48, hayBale: 49, glassPane: 50, strippedSpruceLog: 51, strippedDarkOakLog: 52,
    darkOakPlanks: 53, lightGrayConcrete: 54, grayConcrete: 55, redConcrete: 56, oakWood: 57,
    strippedSpruceWood: 58, strippedDarkOakWood: 59, mossyStoneBricks: 60, quartz: 61,
    acaciaPlanks: 62, spruceWood: 63, orangeWool: 64, limeWool: 65, deepslateBricks: 66,
    polishedDeepslate: 67, barrel: 68, strippedBirchLog: 69, smoothSandstone: 70,
    junglePlanks: 71, oxidizedCutCopper: 72, darkOakLog: 73, strippedOakLog: 74,
    strippedJungleLog: 75, brownMushroomBlock: 76, mossBlock: 77,
  };
  for (const [name, id] of Object.entries(saved)) {
    assert.equal(BLOCK_IDS[name as keyof typeof BLOCK_IDS], id, name);
  }
  const ids = Object.values(BLOCK_IDS);
  assert.equal(new Set(ids).size, ids.length);
});
