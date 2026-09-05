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
