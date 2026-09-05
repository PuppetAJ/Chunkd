/**
 * The numeric identity of every block type.
 *
 * Kept apart from blocks.ts, which also carries textures and colours, so that
 * the world model never depends on image imports. That separation is what lets
 * terrain generation, the save format and the renderer's culling be tested
 * outside a browser.
 *
 * These numbers appear in saved builds, so they must never be reused.
 */
export const BLOCK_IDS = {
  dirt: 1,
  grass: 2,
  glass: 3,
  cobblestone: 4,
  log: 5,
  planks: 6,
  leaves: 7,
  bricks: 8,
  stoneBricks: 9,
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
  BLOCK_IDS.leaves,
]);
