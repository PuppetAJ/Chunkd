/**
 * Kept apart from blocks.ts and its texture imports so this loads in Node.
 * These ids appear in saved builds and must never be reused or renumbered.
 */
export const BLOCK_IDS = {
  // The original nine.
  dirt: 1,
  grass: 2,
  glass: 3,
  cobblestone: 4,
  oakLog: 5,
  oakPlanks: 6,
  oakLeaves: 7,
  mudBricks: 8,
  stoneBricks: 9,

  // Ground.
  sand: 10,
  gravel: 11,
  mud: 12,
  packedMud: 13,
  farmland: 14,
  snow: 15,
  snowyGrass: 16,
  blueIce: 17,

  // Stone.
  stone: 18,
  granite: 19,
  diorite: 20,
  andesite: 21,
  calcite: 22,
  deepslate: 23,
  basalt: 24,
  obsidian: 25,
  amethyst: 26,
  tuff: 27,
  dripstone: 28,
  blackstone: 29,
  endStone: 30,
  mossyCobblestone: 31,

  // Worked stone.
  sandstone: 32,
  cutSandstone: 33,
  chiseledSandstone: 34,
  polishedGranite: 35,
  polishedAndesite: 36,
  bricks: 37,
  polishedDiorite: 38,
  deepslateTiles: 39,

  // Wood.
  spruceLog: 40,
  sprucePlanks: 41,
  spruceLeaves: 42,
  birchLog: 43,
  birchPlanks: 44,
  birchLeaves: 45,
  cherryLog: 46,
  cherryPlanks: 47,
  cherryLeaves: 48,

  // Farm.
  hayBale: 49,

  // Glass.
  glassPane: 50,

  // Added for the imported showcase builds.
  strippedSpruceLog: 51,
  strippedDarkOakLog: 52,
  darkOakPlanks: 53,
  lightGrayConcrete: 54,
  grayConcrete: 55,
  redConcrete: 56,
  // "Wood" is a log with bark on all six faces.
  oakWood: 57,
  strippedSpruceWood: 58,
  strippedDarkOakWood: 59,
  mossyStoneBricks: 60,
  quartz: 61,
  acaciaPlanks: 62,
  spruceWood: 63,
  orangeWool: 64,
  limeWool: 65,
  deepslateBricks: 66,
  polishedDeepslate: 67,
  barrel: 68,
  strippedBirchLog: 69,
  smoothSandstone: 70,
  junglePlanks: 71,
  oxidizedCutCopper: 72,
  darkOakLog: 73,
  strippedOakLog: 74,
  strippedJungleLog: 75,
  brownMushroomBlock: 76,
  mossBlock: 77,
} as const;

export type BlockId = (typeof BLOCK_IDS)[keyof typeof BLOCK_IDS];

/**
 * The blocks Minecraft cuts into slabs. Plain deepslate is out: only its
 * cobbled, polished, brick and tile variants are cut.
 */
export const SLAB_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.stone,
  BLOCK_IDS.cobblestone,
  BLOCK_IDS.mossyCobblestone,
  BLOCK_IDS.granite,
  BLOCK_IDS.diorite,
  BLOCK_IDS.andesite,
  BLOCK_IDS.tuff,
  BLOCK_IDS.blackstone,
  BLOCK_IDS.stoneBricks,
  BLOCK_IDS.bricks,
  BLOCK_IDS.mudBricks,
  BLOCK_IDS.sandstone,
  BLOCK_IDS.cutSandstone,
  BLOCK_IDS.polishedGranite,
  BLOCK_IDS.polishedDiorite,
  BLOCK_IDS.polishedAndesite,
  BLOCK_IDS.deepslateTiles,
  BLOCK_IDS.oakPlanks,
  BLOCK_IDS.sprucePlanks,
  BLOCK_IDS.birchPlanks,
  BLOCK_IDS.cherryPlanks,
  BLOCK_IDS.darkOakPlanks,
  BLOCK_IDS.acaciaPlanks,
  BLOCK_IDS.junglePlanks,
  BLOCK_IDS.mossyStoneBricks,
  BLOCK_IDS.quartz,
  BLOCK_IDS.deepslateBricks,
  BLOCK_IDS.polishedDeepslate,
  BLOCK_IDS.smoothSandstone,
  BLOCK_IDS.oxidizedCutCopper,
]);

/** Everything with a slab except cut sandstone, which has no stairs. */
export const STAIR_BLOCK_IDS: ReadonlySet<number> = new Set(
  [...SLAB_BLOCK_IDS].filter((id) => id !== BLOCK_IDS.cutSandstone),
);

/**
 * Fences and trapdoors exist for every wood. Walls are Minecraft's uneven set:
 * none of plain stone, cut or chiseled sandstone, or polished granite, diorite
 * or andesite, and its deepslate wall is cobbled deepslate, which we lack.
 */
export const FENCE_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.oakPlanks,
  BLOCK_IDS.sprucePlanks,
  BLOCK_IDS.birchPlanks,
  BLOCK_IDS.cherryPlanks,
  BLOCK_IDS.darkOakPlanks,
  BLOCK_IDS.acaciaPlanks,
  BLOCK_IDS.junglePlanks,
]);

export const TRAPDOOR_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.oakPlanks,
  BLOCK_IDS.sprucePlanks,
  BLOCK_IDS.birchPlanks,
  BLOCK_IDS.cherryPlanks,
  BLOCK_IDS.darkOakPlanks,
  BLOCK_IDS.acaciaPlanks,
  BLOCK_IDS.junglePlanks,
]);

export const WALL_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.cobblestone,
  BLOCK_IDS.mossyCobblestone,
  BLOCK_IDS.stoneBricks,
  BLOCK_IDS.granite,
  BLOCK_IDS.diorite,
  BLOCK_IDS.andesite,
  BLOCK_IDS.tuff,
  BLOCK_IDS.blackstone,
  BLOCK_IDS.deepslateTiles,
  BLOCK_IDS.bricks,
  BLOCK_IDS.mudBricks,
  BLOCK_IDS.sandstone,
  BLOCK_IDS.mossyStoneBricks,
  BLOCK_IDS.deepslateBricks,
  BLOCK_IDS.polishedDeepslate,
]);

export const SEE_THROUGH_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.glass,
  BLOCK_IDS.glassPane,
  BLOCK_IDS.oakLeaves,
  BLOCK_IDS.spruceLeaves,
  BLOCK_IDS.birchLeaves,
  BLOCK_IDS.cherryLeaves,
]);

/** A pane is its own block in Minecraft, not a shape of glass, so it is known by id. */
export const PANE_BLOCK_IDS: ReadonlySet<number> = new Set([BLOCK_IDS.glassPane]);
