import { BLOCK_IDS, SLAB_BLOCK_IDS, STAIR_BLOCK_IDS } from "./blockIds.ts";

import amethystUrl from "../../assets/textures/amethyst_block.png";
import andesiteUrl from "../../assets/textures/andesite.png";
import basaltSideUrl from "../../assets/textures/basalt_side.png";
import basaltTopUrl from "../../assets/textures/basalt_top.png";
import birchLeavesUrl from "../../assets/textures/birch_leaves.png";
import birchLogTopUrl from "../../assets/textures/birch_log_top.png";
import birchLogUrl from "../../assets/textures/birch_log.png";
import birchPlanksUrl from "../../assets/textures/birch_planks.png";
import blackstoneTopUrl from "../../assets/textures/blackstone_top.png";
import blackstoneUrl from "../../assets/textures/blackstone.png";
import blueIceUrl from "../../assets/textures/blue_ice.png";
import bricksUrl from "../../assets/textures/bricks.png";
import calciteUrl from "../../assets/textures/calcite.png";
import cherryLeavesUrl from "../../assets/textures/cherry_leaves.png";
import cherryLogTopUrl from "../../assets/textures/cherry_log_top.png";
import cherryLogUrl from "../../assets/textures/cherry_log.png";
import cherryPlanksUrl from "../../assets/textures/cherry_planks.png";
import chiseledSandstoneUrl from "../../assets/textures/chiseled_sandstone.png";
import cobblestoneUrl from "../../assets/textures/cobblestone.png";
import cutSandstoneUrl from "../../assets/textures/cut_sandstone.png";
import deepslateTilesUrl from "../../assets/textures/deepslate_tiles.png";
import deepslateTopUrl from "../../assets/textures/deepslate_top.png";
import deepslateUrl from "../../assets/textures/deepslate.png";
import dioriteUrl from "../../assets/textures/diorite.png";
import dirtUrl from "../../assets/textures/dirt.png";
import dripstoneUrl from "../../assets/textures/dripstone_block.png";
import endStoneUrl from "../../assets/textures/end_stone.png";
import farmlandUrl from "../../assets/textures/farmland.png";
import glassUrl from "../../assets/textures/glass.png";
import graniteUrl from "../../assets/textures/granite.png";
import grassBlockSideUrl from "../../assets/textures/grass_block_side.png";
import grassBlockSnowUrl from "../../assets/textures/grass_block_snow.png";
import grassBlockTopUrl from "../../assets/textures/grass_block_top.png";
import gravelUrl from "../../assets/textures/gravel.png";
import hayBlockSideUrl from "../../assets/textures/hay_block_side.png";
import hayBlockTopUrl from "../../assets/textures/hay_block_top.png";
import mossyCobblestoneUrl from "../../assets/textures/mossy_cobblestone.png";
import mudBricksUrl from "../../assets/textures/mud_bricks.png";
import mudUrl from "../../assets/textures/mud.png";
import oakLeavesUrl from "../../assets/textures/oak_leaves.png";
import oakLogTopUrl from "../../assets/textures/oak_log_top.png";
import oakLogUrl from "../../assets/textures/oak_log.png";
import oakPlanksUrl from "../../assets/textures/oak_planks.png";
import obsidianUrl from "../../assets/textures/obsidian.png";
import packedMudUrl from "../../assets/textures/packed_mud.png";
import polishedAndesiteUrl from "../../assets/textures/polished_andesite.png";
import polishedDioriteUrl from "../../assets/textures/polished_diorite.png";
import polishedGraniteUrl from "../../assets/textures/polished_granite.png";
import sandUrl from "../../assets/textures/sand.png";
import sandstoneBottomUrl from "../../assets/textures/sandstone_bottom.png";
import sandstoneTopUrl from "../../assets/textures/sandstone_top.png";
import sandstoneUrl from "../../assets/textures/sandstone.png";
import snowUrl from "../../assets/textures/snow.png";
import spruceLeavesUrl from "../../assets/textures/spruce_leaves.png";
import spruceLogTopUrl from "../../assets/textures/spruce_log_top.png";
import spruceLogUrl from "../../assets/textures/spruce_log.png";
import sprucePlanksUrl from "../../assets/textures/spruce_planks.png";
import stoneBricksUrl from "../../assets/textures/stone_bricks.png";
import stoneUrl from "../../assets/textures/stone.png";
import tuffUrl from "../../assets/textures/tuff.png";

/**
 * How a block's texture is drawn.
 *
 * - `solid` is every ordinary block: every pixel is opaque.
 * - `cutout` is glass. Its texture is a frame around a hole, and every pixel is
 *   either fully opaque or fully invisible. Drawing it as a cutout throws the
 *   hole away outright, so the frame keeps its full colour and there is no draw
 *   order to get wrong.
 */
export type BlockDraw = "solid" | "cutout";

/** Which drawer of the inventory a block appears in. */
export type BlockGroup = "Ground" | "Stone" | "Worked stone" | "Wood" | "Other";

export interface BlockType {
  /** Stored in saved builds, so these numbers must never be reused. */
  readonly id: number;
  readonly name: string;
  readonly label: string;
  /**
   * One texture per face group. Most blocks repeat the same image on all six
   * sides; grass, logs and hay do not, which is the whole reason this is three
   * fields rather than one.
   */
  readonly top: string;
  readonly side: string;
  readonly bottom: string;
  readonly draw: BlockDraw;
  /**
   * True for blocks with a grain. Placing one against the side of something
   * lays it down along the direction you built from, rather than leaving it
   * standing upright.
   */
  readonly directional: boolean;
  /** Whether this block can be laid as a slab, and as stairs. See blockIds.ts. */
  readonly slab: boolean;
  readonly stairs: boolean;
  readonly group: BlockGroup;
}

interface BlockInput {
  id: number;
  name: string;
  label: string;
  group: BlockGroup;
  /** Used on every face unless top, side or bottom overrides it. */
  texture?: string;
  top?: string;
  side?: string;
  bottom?: string;
  draw?: BlockDraw;
  directional?: boolean;
}

function define(input: BlockInput): BlockType {
  const fallback = input.texture ?? input.side ?? input.top!;
  return {
    id: input.id,
    name: input.name,
    label: input.label,
    top: input.top ?? fallback,
    side: input.side ?? fallback,
    bottom: input.bottom ?? input.top ?? fallback,
    draw: input.draw ?? "solid",
    directional: input.directional ?? false,
    slab: SLAB_BLOCK_IDS.has(input.id),
    stairs: STAIR_BLOCK_IDS.has(input.id),
    group: input.group,
  };
}

/**
 * One entry per placeable block.
 *
 * This is the single source of truth. The hotbar, the inventory, the renderer
 * and the save format all read from it, so adding a block means adding one row
 * here rather than editing the same list in several files.
 */
export const BLOCKS: readonly BlockType[] = [
  // Ground
  define({ id: BLOCK_IDS.grass, name: "grass", label: "Grass", group: "Ground", top: grassBlockTopUrl, side: grassBlockSideUrl, bottom: dirtUrl }),
  define({ id: BLOCK_IDS.dirt, name: "dirt", label: "Dirt", group: "Ground", texture: dirtUrl }),
  define({ id: BLOCK_IDS.sand, name: "sand", label: "Sand", group: "Ground", texture: sandUrl }),
  define({ id: BLOCK_IDS.gravel, name: "gravel", label: "Gravel", group: "Ground", texture: gravelUrl }),
  define({ id: BLOCK_IDS.mud, name: "mud", label: "Mud", group: "Ground", texture: mudUrl }),
  define({ id: BLOCK_IDS.packedMud, name: "packed_mud", label: "Packed Mud", group: "Ground", texture: packedMudUrl }),
  define({ id: BLOCK_IDS.farmland, name: "farmland", label: "Farmland", group: "Ground", top: farmlandUrl, side: dirtUrl, bottom: dirtUrl }),
  define({ id: BLOCK_IDS.snow, name: "snow", label: "Snow", group: "Ground", texture: snowUrl }),
  define({ id: BLOCK_IDS.snowyGrass, name: "snowy_grass", label: "Snowy Grass", group: "Ground", top: snowUrl, side: grassBlockSnowUrl, bottom: dirtUrl }),
  define({ id: BLOCK_IDS.blueIce, name: "blue_ice", label: "Blue Ice", group: "Ground", texture: blueIceUrl }),

  // Stone
  define({ id: BLOCK_IDS.stone, name: "stone", label: "Stone", group: "Stone", texture: stoneUrl }),
  define({ id: BLOCK_IDS.cobblestone, name: "cobblestone", label: "Cobblestone", group: "Stone", texture: cobblestoneUrl }),
  define({ id: BLOCK_IDS.mossyCobblestone, name: "mossy_cobblestone", label: "Mossy Cobblestone", group: "Stone", texture: mossyCobblestoneUrl }),
  define({ id: BLOCK_IDS.granite, name: "granite", label: "Granite", group: "Stone", texture: graniteUrl }),
  define({ id: BLOCK_IDS.diorite, name: "diorite", label: "Diorite", group: "Stone", texture: dioriteUrl }),
  define({ id: BLOCK_IDS.andesite, name: "andesite", label: "Andesite", group: "Stone", texture: andesiteUrl }),
  define({ id: BLOCK_IDS.calcite, name: "calcite", label: "Calcite", group: "Stone", texture: calciteUrl }),
  define({ id: BLOCK_IDS.tuff, name: "tuff", label: "Tuff", group: "Stone", texture: tuffUrl }),
  define({ id: BLOCK_IDS.dripstone, name: "dripstone", label: "Dripstone", group: "Stone", texture: dripstoneUrl }),
  define({ id: BLOCK_IDS.deepslate, name: "deepslate", label: "Deepslate", group: "Stone", top: deepslateTopUrl, side: deepslateUrl, directional: true }),
  define({ id: BLOCK_IDS.basalt, name: "basalt", label: "Basalt", group: "Stone", top: basaltTopUrl, side: basaltSideUrl, directional: true }),
  define({ id: BLOCK_IDS.blackstone, name: "blackstone", label: "Blackstone", group: "Stone", top: blackstoneTopUrl, side: blackstoneUrl }),
  define({ id: BLOCK_IDS.obsidian, name: "obsidian", label: "Obsidian", group: "Stone", texture: obsidianUrl }),
  define({ id: BLOCK_IDS.amethyst, name: "amethyst", label: "Amethyst", group: "Stone", texture: amethystUrl }),
  define({ id: BLOCK_IDS.endStone, name: "end_stone", label: "End Stone", group: "Stone", texture: endStoneUrl }),

  // Worked stone
  define({ id: BLOCK_IDS.stoneBricks, name: "stone_bricks", label: "Stone Bricks", group: "Worked stone", texture: stoneBricksUrl }),
  define({ id: BLOCK_IDS.bricks, name: "bricks", label: "Bricks", group: "Worked stone", texture: bricksUrl }),
  define({ id: BLOCK_IDS.mudBricks, name: "mud_bricks", label: "Mud Bricks", group: "Worked stone", texture: mudBricksUrl }),
  define({ id: BLOCK_IDS.sandstone, name: "sandstone", label: "Sandstone", group: "Worked stone", top: sandstoneTopUrl, side: sandstoneUrl, bottom: sandstoneBottomUrl }),
  define({ id: BLOCK_IDS.cutSandstone, name: "cut_sandstone", label: "Cut Sandstone", group: "Worked stone", top: sandstoneTopUrl, side: cutSandstoneUrl, bottom: sandstoneTopUrl }),
  define({ id: BLOCK_IDS.chiseledSandstone, name: "chiseled_sandstone", label: "Chiseled Sandstone", group: "Worked stone", top: sandstoneTopUrl, side: chiseledSandstoneUrl, bottom: sandstoneTopUrl }),
  define({ id: BLOCK_IDS.polishedGranite, name: "polished_granite", label: "Polished Granite", group: "Worked stone", texture: polishedGraniteUrl }),
  define({ id: BLOCK_IDS.polishedDiorite, name: "polished_diorite", label: "Polished Diorite", group: "Worked stone", texture: polishedDioriteUrl }),
  define({ id: BLOCK_IDS.polishedAndesite, name: "polished_andesite", label: "Polished Andesite", group: "Worked stone", texture: polishedAndesiteUrl }),
  define({ id: BLOCK_IDS.deepslateTiles, name: "deepslate_tiles", label: "Deepslate Tiles", group: "Worked stone", texture: deepslateTilesUrl }),

  // Wood
  define({ id: BLOCK_IDS.oakLog, name: "oak_log", label: "Oak Log", group: "Wood", top: oakLogTopUrl, side: oakLogUrl, directional: true }),
  define({ id: BLOCK_IDS.oakPlanks, name: "oak_planks", label: "Oak Planks", group: "Wood", texture: oakPlanksUrl }),
  define({ id: BLOCK_IDS.oakLeaves, name: "oak_leaves", label: "Oak Leaves", group: "Wood", texture: oakLeavesUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.spruceLog, name: "spruce_log", label: "Spruce Log", group: "Wood", top: spruceLogTopUrl, side: spruceLogUrl, directional: true }),
  define({ id: BLOCK_IDS.sprucePlanks, name: "spruce_planks", label: "Spruce Planks", group: "Wood", texture: sprucePlanksUrl }),
  define({ id: BLOCK_IDS.spruceLeaves, name: "spruce_leaves", label: "Spruce Leaves", group: "Wood", texture: spruceLeavesUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.birchLog, name: "birch_log", label: "Birch Log", group: "Wood", top: birchLogTopUrl, side: birchLogUrl, directional: true }),
  define({ id: BLOCK_IDS.birchPlanks, name: "birch_planks", label: "Birch Planks", group: "Wood", texture: birchPlanksUrl }),
  define({ id: BLOCK_IDS.birchLeaves, name: "birch_leaves", label: "Birch Leaves", group: "Wood", texture: birchLeavesUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.cherryLog, name: "cherry_log", label: "Cherry Log", group: "Wood", top: cherryLogTopUrl, side: cherryLogUrl, directional: true }),
  define({ id: BLOCK_IDS.cherryPlanks, name: "cherry_planks", label: "Cherry Planks", group: "Wood", texture: cherryPlanksUrl }),
  define({ id: BLOCK_IDS.cherryLeaves, name: "cherry_leaves", label: "Cherry Leaves", group: "Wood", texture: cherryLeavesUrl, draw: "cutout" }),

  // Other
  define({ id: BLOCK_IDS.glass, name: "glass", label: "Glass", group: "Other", texture: glassUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.hayBale, name: "hay_bale", label: "Hay Bale", group: "Other", top: hayBlockTopUrl, side: hayBlockSideUrl, directional: true }),
];

const BY_ID = new Map(BLOCKS.map((block) => [block.id, block]));

export function getBlock(id: number): BlockType | undefined {
  return BY_ID.get(id);
}

/** Every distinct texture the block table refers to, deduplicated. */
export const TEXTURE_URLS: readonly string[] = [
  ...new Set(BLOCKS.flatMap((block) => [block.top, block.side, block.bottom])),
];

export const DEFAULT_BLOCK_ID = BLOCK_IDS.grass;

/** The blocks a fresh hotbar starts with, left to right. */
export const DEFAULT_HOTBAR: readonly number[] = [
  BLOCK_IDS.grass,
  BLOCK_IDS.dirt,
  BLOCK_IDS.stone,
  BLOCK_IDS.cobblestone,
  BLOCK_IDS.oakLog,
  BLOCK_IDS.oakPlanks,
  BLOCK_IDS.oakLeaves,
  BLOCK_IDS.glass,
  BLOCK_IDS.stoneBricks,
];
