/**
 * The numeric identity of every block type.
 *
 * Kept apart from blocks.ts, which also carries textures, so that the world
 * model never depends on image imports. That separation is what lets terrain
 * generation, the save format and the renderer's culling be tested outside a
 * browser.
 *
 * These numbers appear in saved builds, so they must never be reused or
 * renumbered. Ids 1 to 9 are the original nine blocks and keep their meaning,
 * which is why the list is not in a tidy order.
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
} as const;

export type BlockId = (typeof BLOCK_IDS)[keyof typeof BLOCK_IDS];

/**
 * Blocks you can see through.
 *
 * This matters to the renderer's culling pass, which skips any block whose six
 * neighbours are all present. A neighbour only hides a face if it is opaque, so
 * a dirt block under a glass floor still has to be drawn: without this set it
 * was culled and you looked through the glass into a hole.
 *
 * It lives here rather than in blocks.ts so the culling pass stays free of
 * image imports and can still be tested outside a browser.
 */
export const SEE_THROUGH_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.glass,
  BLOCK_IDS.oakLeaves,
  BLOCK_IDS.spruceLeaves,
  BLOCK_IDS.birchLeaves,
  BLOCK_IDS.cherryLeaves,
]);
