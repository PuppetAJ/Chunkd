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
/**
 * The blocks that can be laid as slabs, and as stairs.
 *
 * These are the blocks Minecraft gives those variants to, taken from the game
 * rather than worked out from our own textures. Sandstone has three textures
 * and is in; plain deepslate has two and is out, because only its cobbled,
 * polished, brick and tile variants are cut in the game and we carry the tiles
 * alone. A block cut in half wraps the expected face onto the new shape, so
 * how many textures it has does not come into it.
 *
 * Two sets because they differ by one: cut sandstone has a slab and no stairs.
 *
 * They live here rather than in blocks.ts so they can be tested and consulted
 * without pulling in the texture imports, the same reason the id table itself
 * is here.
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
]);

/** Everything with a slab except cut sandstone, which has no stairs. */
export const STAIR_BLOCK_IDS: ReadonlySet<number> = new Set(
  [...SLAB_BLOCK_IDS].filter((id) => id !== BLOCK_IDS.cutSandstone),
);

/**
 * The blocks Minecraft gives a fence, a wall and a trapdoor, checked against
 * the game's own lists rather than inferred from ours.
 *
 * Fences and trapdoors exist for every wood, which of ours is the four planks.
 * Walls are the uneven set: there is no wall of plain stone, of cut or chiseled
 * sandstone, or of polished granite, diorite or andesite, and the deepslate
 * wall is of cobbled deepslate, which we do not carry.
 */
export const FENCE_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.oakPlanks,
  BLOCK_IDS.sprucePlanks,
  BLOCK_IDS.birchPlanks,
  BLOCK_IDS.cherryPlanks,
]);

export const TRAPDOOR_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.oakPlanks,
  BLOCK_IDS.sprucePlanks,
  BLOCK_IDS.birchPlanks,
  BLOCK_IDS.cherryPlanks,
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
]);

export const SEE_THROUGH_BLOCK_IDS: ReadonlySet<number> = new Set([
  BLOCK_IDS.glass,
  BLOCK_IDS.oakLeaves,
  BLOCK_IDS.spruceLeaves,
  BLOCK_IDS.birchLeaves,
  BLOCK_IDS.cherryLeaves,
]);
