import { BLOCK_IDS } from "./blockIds.ts";
import bricksUrl from "../../assets/textures/bricks.png";
import cobblestoneUrl from "../../assets/textures/cobblestone.png";
import dirtUrl from "../../assets/textures/dirt.png";
import glassUrl from "../../assets/textures/glass.png";
import grassUrl from "../../assets/textures/grass.png";
import leavesUrl from "../../assets/textures/leaves.png";
import logUrl from "../../assets/textures/log.png";
import planksUrl from "../../assets/textures/planks.png";
import stoneBricksUrl from "../../assets/textures/stone_bricks.png";

// One entry per placeable block.
//
// This is the single source of truth. The hotbar, the renderer and the save
// format all read from it, so adding a block means adding one row here rather
// than editing the same nine-branch if/else in three different files, which is
// what the previous version did.
/**
 * How a block's texture is drawn.
 *
 * - `solid` is every ordinary block: every pixel is opaque.
 * - `cutout` is glass. Its texture is a frame around a hole, and every pixel is
 *   either fully opaque or fully invisible. Drawing it as a cutout throws the
 *   hole away outright, so the frame keeps its full colour and there is no
 *   draw order to get wrong.
 * - `blend` is a block that is uniformly see-through, like leaves.
 */
export type BlockDraw = "solid" | "cutout" | "blend";

export interface BlockType {
  /** Stored in saved builds, so these numbers must never be reused. */
  readonly id: number;
  readonly name: string;
  readonly label: string;
  readonly textureUrl: string;
  /** The textures are greyscale masks; this tints them. */
  readonly tint: string;
  readonly draw: BlockDraw;
  /**
   * Glass lets nearly all the light through, so casting a shadow from it drew a
   * solid black block on the ground and made the frame shadow itself in stripes.
   */
  readonly castsShadow: boolean;
}

export const BLOCKS: readonly BlockType[] = [
  { id: BLOCK_IDS.dirt, name: "dirt", label: "Dirt", textureUrl: dirtUrl, tint: "#7a5a05", draw: "solid", castsShadow: true },
  { id: BLOCK_IDS.grass, name: "grass", label: "Grass", textureUrl: grassUrl, tint: "#567d3c", draw: "solid", castsShadow: true },
  { id: BLOCK_IDS.glass, name: "glass", label: "Glass", textureUrl: glassUrl, tint: "#9fd3e0", draw: "cutout", castsShadow: false },
  { id: BLOCK_IDS.cobblestone, name: "cobblestone", label: "Cobblestone", textureUrl: cobblestoneUrl, tint: "#737373", draw: "solid", castsShadow: true },
  { id: BLOCK_IDS.log, name: "log", label: "Log", textureUrl: logUrl, tint: "#6b542e", draw: "solid", castsShadow: true },
  { id: BLOCK_IDS.planks, name: "planks", label: "Planks", textureUrl: planksUrl, tint: "#856738", draw: "solid", castsShadow: true },
  { id: BLOCK_IDS.leaves, name: "leaves", label: "Leaves", textureUrl: leavesUrl, tint: "#344d2c", draw: "blend", castsShadow: true },
  { id: BLOCK_IDS.bricks, name: "bricks", label: "Bricks", textureUrl: bricksUrl, tint: "#8c5d50", draw: "solid", castsShadow: true },
  { id: BLOCK_IDS.stoneBricks, name: "stone_bricks", label: "Stone Bricks", textureUrl: stoneBricksUrl, tint: "#8a8a8a", draw: "solid", castsShadow: true },
];

const BY_ID = new Map(BLOCKS.map((block) => [block.id, block]));

export function getBlock(id: number): BlockType | undefined {
  return BY_ID.get(id);
}

/** The block a hotbar digit selects. Slot 1 is the first entry. */
export function blockForSlot(slot: number): BlockType | undefined {
  return BLOCKS[slot - 1];
}

export const DEFAULT_BLOCK_ID = BLOCKS[0]!.id;
