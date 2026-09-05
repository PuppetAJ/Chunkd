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
  cobblestoneBricks: 9,

  // Ground.
  sand: 10,
  gravel: 11,
  mud: 12,
  crackedMud: 13,
  farmland: 14,
  snow: 15,
  snowyGrass: 16,
  glacierIce: 17,

  // Stone.
  stone: 18,
  granite: 19,
  diorite: 20,
  marble: 21,
  limestone: 22,
  slate: 23,
  basalt: 24,
  obsidian: 25,
  amethyst: 26,
  serpentine: 27,
  schist: 28,
  gabbro: 29,
  rhyolite: 30,
  mossyCobblestone: 31,

  // Worked stone.
  sandstone: 32,
  sandstoneBricks: 33,
  carvedSandstone: 34,
  graniteBricks: 35,
  marbleBricks: 36,
  limestoneBricks: 37,
  serpentineBricks: 38,
  slateTiles: 39,

  // Wood.
  pineLog: 40,
  pinePlanks: 41,
  pineLeaves: 42,
  beechLog: 43,
  beechPlanks: 44,
  beechLeaves: 45,
  mapleLog: 46,
  maplePlanks: 47,
  mapleLeaves: 48,

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
export const SEE_THROUGH_BLOCK_IDS: ReadonlySet<number> = new Set([BLOCK_IDS.glass]);
