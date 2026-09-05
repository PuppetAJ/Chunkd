import { BLOCK_IDS } from "./blockIds.ts";

import amethystUrl from "../../assets/textures/amethyst.png";
import basaltUrl from "../../assets/textures/basalt.png";
import beechLeavesUrl from "../../assets/textures/beech_leaves.png";
import beechLogSideUrl from "../../assets/textures/beech_log_side.png";
import beechLogTopUrl from "../../assets/textures/beech_log_top.png";
import beechPlanksUrl from "../../assets/textures/beech_planks.png";
import carvedSandstoneUrl from "../../assets/textures/sandstone_carved.png";
import cobblestoneUrl from "../../assets/textures/cobblestone.png";
import cobblestoneBricksUrl from "../../assets/textures/cobblestone_bricks.png";
import crackedMudUrl from "../../assets/textures/mud_cracked.png";
import diorite from "../../assets/textures/diorite.png";
import dirtUrl from "../../assets/textures/dirt.png";
import farmlandUrl from "../../assets/textures/farmland.png";
import gabbroUrl from "../../assets/textures/gabbro.png";
import glacierIceUrl from "../../assets/textures/ice_glacier.png";
import glassUrl from "../../assets/textures/glass.png";
import graniteUrl from "../../assets/textures/granite.png";
import graniteBricksUrl from "../../assets/textures/granite_bricks.png";
import grassSideUrl from "../../assets/textures/grass_side.png";
import grassTopUrl from "../../assets/textures/grass_top.png";
import gravelUrl from "../../assets/textures/gravel.png";
import haySideUrl from "../../assets/textures/hay_side.png";
import hayTopUrl from "../../assets/textures/hay_top.png";
import limestoneUrl from "../../assets/textures/limestone.png";
import limestoneBricksUrl from "../../assets/textures/limestone_bricks.png";
import mapleLeavesUrl from "../../assets/textures/maple_leaves.png";
import mapleLogSideUrl from "../../assets/textures/maple_log_side.png";
import mapleLogTopUrl from "../../assets/textures/maple_log_top.png";
import maplePlanksUrl from "../../assets/textures/maple_planks.png";
import marbleUrl from "../../assets/textures/marble.png";
import marbleBricksUrl from "../../assets/textures/marble_bricks.png";
import mossyCobblestoneUrl from "../../assets/textures/cobblestone_mossy.png";
import mudUrl from "../../assets/textures/mud.png";
import mudBricksUrl from "../../assets/textures/mud_bricks.png";
import oakLeavesUrl from "../../assets/textures/oak_leaves.png";
import oakLogSideUrl from "../../assets/textures/oak_log_side.png";
import oakLogTopUrl from "../../assets/textures/oak_log_top.png";
import oakPlanksUrl from "../../assets/textures/oak_planks.png";
import obsidianUrl from "../../assets/textures/obsidian.png";
import pineLeavesUrl from "../../assets/textures/pine_leaves.png";
import pineLogSideUrl from "../../assets/textures/pine_log_side.png";
import pineLogTopUrl from "../../assets/textures/pine_log_top.png";
import pinePlanksUrl from "../../assets/textures/pine_planks.png";
import rhyoliteUrl from "../../assets/textures/rhyolite.png";
import sandUrl from "../../assets/textures/sand_ugly.png";
import sandstoneUrl from "../../assets/textures/sandstone.png";
import sandstoneBricksUrl from "../../assets/textures/sandstone_bricks.png";
import schistUrl from "../../assets/textures/schist.png";
import serpentineUrl from "../../assets/textures/serpentine.png";
import serpentineBricksUrl from "../../assets/textures/serpentine_bricks.png";
import slateUrl from "../../assets/textures/slate.png";
import slateTilesUrl from "../../assets/textures/slate_tiles.png";
import snowUrl from "../../assets/textures/snow.png";
import snowyGrassSideUrl from "../../assets/textures/grass_snowy_side.png";
import stoneUrl from "../../assets/textures/stone_generic.png";

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
  define({ id: BLOCK_IDS.grass, name: "grass", label: "Grass", group: "Ground", top: grassTopUrl, side: grassSideUrl, bottom: dirtUrl }),
  define({ id: BLOCK_IDS.dirt, name: "dirt", label: "Dirt", group: "Ground", texture: dirtUrl }),
  define({ id: BLOCK_IDS.sand, name: "sand", label: "Sand", group: "Ground", texture: sandUrl }),
  define({ id: BLOCK_IDS.gravel, name: "gravel", label: "Gravel", group: "Ground", texture: gravelUrl }),
  define({ id: BLOCK_IDS.mud, name: "mud", label: "Mud", group: "Ground", texture: mudUrl }),
  define({ id: BLOCK_IDS.crackedMud, name: "cracked_mud", label: "Cracked Mud", group: "Ground", texture: crackedMudUrl }),
  define({ id: BLOCK_IDS.farmland, name: "farmland", label: "Farmland", group: "Ground", top: farmlandUrl, side: dirtUrl, bottom: dirtUrl }),
  define({ id: BLOCK_IDS.snow, name: "snow", label: "Snow", group: "Ground", texture: snowUrl }),
  define({ id: BLOCK_IDS.snowyGrass, name: "snowy_grass", label: "Snowy Grass", group: "Ground", top: snowUrl, side: snowyGrassSideUrl, bottom: dirtUrl }),
  define({ id: BLOCK_IDS.glacierIce, name: "glacier_ice", label: "Glacier Ice", group: "Ground", texture: glacierIceUrl }),

  // Stone
  define({ id: BLOCK_IDS.stone, name: "stone", label: "Stone", group: "Stone", texture: stoneUrl }),
  define({ id: BLOCK_IDS.cobblestone, name: "cobblestone", label: "Cobblestone", group: "Stone", texture: cobblestoneUrl }),
  define({ id: BLOCK_IDS.mossyCobblestone, name: "mossy_cobblestone", label: "Mossy Cobblestone", group: "Stone", texture: mossyCobblestoneUrl }),
  define({ id: BLOCK_IDS.granite, name: "granite", label: "Granite", group: "Stone", texture: graniteUrl }),
  define({ id: BLOCK_IDS.diorite, name: "diorite", label: "Diorite", group: "Stone", texture: diorite }),
  define({ id: BLOCK_IDS.marble, name: "marble", label: "Marble", group: "Stone", texture: marbleUrl }),
  define({ id: BLOCK_IDS.limestone, name: "limestone", label: "Limestone", group: "Stone", texture: limestoneUrl }),
  define({ id: BLOCK_IDS.slate, name: "slate", label: "Slate", group: "Stone", texture: slateUrl }),
  define({ id: BLOCK_IDS.basalt, name: "basalt", label: "Basalt", group: "Stone", texture: basaltUrl }),
  define({ id: BLOCK_IDS.schist, name: "schist", label: "Schist", group: "Stone", texture: schistUrl }),
  define({ id: BLOCK_IDS.gabbro, name: "gabbro", label: "Gabbro", group: "Stone", texture: gabbroUrl }),
  define({ id: BLOCK_IDS.rhyolite, name: "rhyolite", label: "Rhyolite", group: "Stone", texture: rhyoliteUrl }),
  define({ id: BLOCK_IDS.serpentine, name: "serpentine", label: "Serpentine", group: "Stone", texture: serpentineUrl }),
  define({ id: BLOCK_IDS.obsidian, name: "obsidian", label: "Obsidian", group: "Stone", texture: obsidianUrl }),
  define({ id: BLOCK_IDS.amethyst, name: "amethyst", label: "Amethyst", group: "Stone", texture: amethystUrl }),

  // Worked stone
  define({ id: BLOCK_IDS.cobblestoneBricks, name: "cobblestone_bricks", label: "Cobblestone Bricks", group: "Worked stone", texture: cobblestoneBricksUrl }),
  define({ id: BLOCK_IDS.mudBricks, name: "mud_bricks", label: "Mud Bricks", group: "Worked stone", texture: mudBricksUrl }),
  define({ id: BLOCK_IDS.sandstone, name: "sandstone", label: "Sandstone", group: "Worked stone", texture: sandstoneUrl }),
  define({ id: BLOCK_IDS.sandstoneBricks, name: "sandstone_bricks", label: "Sandstone Bricks", group: "Worked stone", texture: sandstoneBricksUrl }),
  define({ id: BLOCK_IDS.carvedSandstone, name: "carved_sandstone", label: "Carved Sandstone", group: "Worked stone", texture: carvedSandstoneUrl }),
  define({ id: BLOCK_IDS.graniteBricks, name: "granite_bricks", label: "Granite Bricks", group: "Worked stone", texture: graniteBricksUrl }),
  define({ id: BLOCK_IDS.marbleBricks, name: "marble_bricks", label: "Marble Bricks", group: "Worked stone", texture: marbleBricksUrl }),
  define({ id: BLOCK_IDS.limestoneBricks, name: "limestone_bricks", label: "Limestone Bricks", group: "Worked stone", texture: limestoneBricksUrl }),
  define({ id: BLOCK_IDS.serpentineBricks, name: "serpentine_bricks", label: "Serpentine Bricks", group: "Worked stone", texture: serpentineBricksUrl }),
  define({ id: BLOCK_IDS.slateTiles, name: "slate_tiles", label: "Slate Tiles", group: "Worked stone", texture: slateTilesUrl }),

  // Wood
  define({ id: BLOCK_IDS.oakLog, name: "oak_log", label: "Oak Log", group: "Wood", top: oakLogTopUrl, side: oakLogSideUrl, directional: true }),
  define({ id: BLOCK_IDS.oakPlanks, name: "oak_planks", label: "Oak Planks", group: "Wood", texture: oakPlanksUrl }),
  define({ id: BLOCK_IDS.oakLeaves, name: "oak_leaves", label: "Oak Leaves", group: "Wood", texture: oakLeavesUrl }),
  define({ id: BLOCK_IDS.pineLog, name: "pine_log", label: "Pine Log", group: "Wood", top: pineLogTopUrl, side: pineLogSideUrl, directional: true }),
  define({ id: BLOCK_IDS.pinePlanks, name: "pine_planks", label: "Pine Planks", group: "Wood", texture: pinePlanksUrl }),
  define({ id: BLOCK_IDS.pineLeaves, name: "pine_leaves", label: "Pine Leaves", group: "Wood", texture: pineLeavesUrl }),
  define({ id: BLOCK_IDS.beechLog, name: "beech_log", label: "Beech Log", group: "Wood", top: beechLogTopUrl, side: beechLogSideUrl, directional: true }),
  define({ id: BLOCK_IDS.beechPlanks, name: "beech_planks", label: "Beech Planks", group: "Wood", texture: beechPlanksUrl }),
  define({ id: BLOCK_IDS.beechLeaves, name: "beech_leaves", label: "Beech Leaves", group: "Wood", texture: beechLeavesUrl }),
  define({ id: BLOCK_IDS.mapleLog, name: "maple_log", label: "Maple Log", group: "Wood", top: mapleLogTopUrl, side: mapleLogSideUrl, directional: true }),
  define({ id: BLOCK_IDS.maplePlanks, name: "maple_planks", label: "Maple Planks", group: "Wood", texture: maplePlanksUrl }),
  define({ id: BLOCK_IDS.mapleLeaves, name: "maple_leaves", label: "Maple Leaves", group: "Wood", texture: mapleLeavesUrl }),

  // Other
  define({ id: BLOCK_IDS.glass, name: "glass", label: "Glass", group: "Other", texture: glassUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.hayBale, name: "hay_bale", label: "Hay Bale", group: "Other", top: hayTopUrl, side: haySideUrl, directional: true }),
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
  BLOCK_IDS.sandstoneBricks,
];
