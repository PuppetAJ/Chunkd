import {
  BLOCK_IDS,
  FENCE_BLOCK_IDS,
  SLAB_BLOCK_IDS,
  STAIR_BLOCK_IDS,
  WALL_BLOCK_IDS,
} from "./blockIds.ts";

import amethystUrl from "../../assets/textures/amethyst_block.png";
import acaciaPlanksUrl from "../../assets/textures/acacia_planks.png";
import acaciaTrapdoorUrl from "../../assets/textures/acacia_trapdoor.png";
import andesiteUrl from "../../assets/textures/andesite.png";
import basaltSideUrl from "../../assets/textures/basalt_side.png";
import basaltTopUrl from "../../assets/textures/basalt_top.png";
import barrelBottomUrl from "../../assets/textures/barrel_bottom.png";
import barrelSideUrl from "../../assets/textures/barrel_side.png";
import barrelTopUrl from "../../assets/textures/barrel_top.png";
import birchLeavesUrl from "../../assets/textures/birch_leaves.png";
import birchLogTopUrl from "../../assets/textures/birch_log_top.png";
import birchLogUrl from "../../assets/textures/birch_log.png";
import birchPlanksUrl from "../../assets/textures/birch_planks.png";
import birchTrapdoorUrl from "../../assets/textures/birch_trapdoor.png";
import blackstoneTopUrl from "../../assets/textures/blackstone_top.png";
import blackstoneUrl from "../../assets/textures/blackstone.png";
import blueIceUrl from "../../assets/textures/blue_ice.png";
import bricksUrl from "../../assets/textures/bricks.png";
import brownMushroomBlockUrl from "../../assets/textures/brown_mushroom_block.png";
import calciteUrl from "../../assets/textures/calcite.png";
import cherryLeavesUrl from "../../assets/textures/cherry_leaves.png";
import cherryLogTopUrl from "../../assets/textures/cherry_log_top.png";
import cherryLogUrl from "../../assets/textures/cherry_log.png";
import cherryPlanksUrl from "../../assets/textures/cherry_planks.png";
import cherryTrapdoorUrl from "../../assets/textures/cherry_trapdoor.png";
import chiseledSandstoneUrl from "../../assets/textures/chiseled_sandstone.png";
import cobblestoneUrl from "../../assets/textures/cobblestone.png";
import cutSandstoneUrl from "../../assets/textures/cut_sandstone.png";
import darkOakPlanksUrl from "../../assets/textures/dark_oak_planks.png";
import darkOakTrapdoorUrl from "../../assets/textures/dark_oak_trapdoor.png";
import darkOakLogTopUrl from "../../assets/textures/dark_oak_log_top.png";
import darkOakLogUrl from "../../assets/textures/dark_oak_log.png";
import deepslateBricksUrl from "../../assets/textures/deepslate_bricks.png";
import deepslateTilesUrl from "../../assets/textures/deepslate_tiles.png";
import deepslateTopUrl from "../../assets/textures/deepslate_top.png";
import deepslateUrl from "../../assets/textures/deepslate.png";
import dioriteUrl from "../../assets/textures/diorite.png";
import dirtUrl from "../../assets/textures/dirt.png";
import dripstoneUrl from "../../assets/textures/dripstone_block.png";
import endStoneUrl from "../../assets/textures/end_stone.png";
import farmlandUrl from "../../assets/textures/farmland.png";
import glassUrl from "../../assets/textures/glass.png";
import glassPaneTopUrl from "../../assets/textures/glass_pane_top.png";
import graniteUrl from "../../assets/textures/granite.png";
import grayConcreteUrl from "../../assets/textures/gray_concrete.png";
import grassBlockSideUrl from "../../assets/textures/grass_block_side.png";
import grassBlockSnowUrl from "../../assets/textures/grass_block_snow.png";
import grassBlockTopUrl from "../../assets/textures/grass_block_top.png";
import gravelUrl from "../../assets/textures/gravel.png";
import hayBlockSideUrl from "../../assets/textures/hay_block_side.png";
import hayBlockTopUrl from "../../assets/textures/hay_block_top.png";
import junglePlanksUrl from "../../assets/textures/jungle_planks.png";
import jungleTrapdoorUrl from "../../assets/textures/jungle_trapdoor.png";
import limeWoolUrl from "../../assets/textures/lime_wool.png";
import lightGrayConcreteUrl from "../../assets/textures/light_gray_concrete.png";
import mossyCobblestoneUrl from "../../assets/textures/mossy_cobblestone.png";
import mossBlockUrl from "../../assets/textures/moss_block.png";
import mossyStoneBricksUrl from "../../assets/textures/mossy_stone_bricks.png";
import mudBricksUrl from "../../assets/textures/mud_bricks.png";
import mudUrl from "../../assets/textures/mud.png";
import oakLeavesUrl from "../../assets/textures/oak_leaves.png";
import oakLogTopUrl from "../../assets/textures/oak_log_top.png";
import oakLogUrl from "../../assets/textures/oak_log.png";
import oakPlanksUrl from "../../assets/textures/oak_planks.png";
import oakTrapdoorUrl from "../../assets/textures/oak_trapdoor.png";
import obsidianUrl from "../../assets/textures/obsidian.png";
import orangeWoolUrl from "../../assets/textures/orange_wool.png";
import oxidizedCutCopperUrl from "../../assets/textures/oxidized_cut_copper.png";
import packedMudUrl from "../../assets/textures/packed_mud.png";
import polishedAndesiteUrl from "../../assets/textures/polished_andesite.png";
import polishedDioriteUrl from "../../assets/textures/polished_diorite.png";
import polishedDeepslateUrl from "../../assets/textures/polished_deepslate.png";
import polishedGraniteUrl from "../../assets/textures/polished_granite.png";
import redConcreteUrl from "../../assets/textures/red_concrete.png";
import quartzBottomUrl from "../../assets/textures/quartz_block_bottom.png";
import quartzSideUrl from "../../assets/textures/quartz_block_side.png";
import quartzTopUrl from "../../assets/textures/quartz_block_top.png";
import sandUrl from "../../assets/textures/sand.png";
import sandstoneBottomUrl from "../../assets/textures/sandstone_bottom.png";
import sandstoneTopUrl from "../../assets/textures/sandstone_top.png";
import sandstoneUrl from "../../assets/textures/sandstone.png";
import snowUrl from "../../assets/textures/snow.png";
import spruceLeavesUrl from "../../assets/textures/spruce_leaves.png";
import spruceLogTopUrl from "../../assets/textures/spruce_log_top.png";
import spruceLogUrl from "../../assets/textures/spruce_log.png";
import sprucePlanksUrl from "../../assets/textures/spruce_planks.png";
import spruceTrapdoorUrl from "../../assets/textures/spruce_trapdoor.png";
import strippedDarkOakLogTopUrl from "../../assets/textures/stripped_dark_oak_log_top.png";
import strippedDarkOakLogUrl from "../../assets/textures/stripped_dark_oak_log.png";
import strippedSpruceLogTopUrl from "../../assets/textures/stripped_spruce_log_top.png";
import strippedSpruceLogUrl from "../../assets/textures/stripped_spruce_log.png";
import strippedBirchLogTopUrl from "../../assets/textures/stripped_birch_log_top.png";
import strippedBirchLogUrl from "../../assets/textures/stripped_birch_log.png";
import strippedJungleLogTopUrl from "../../assets/textures/stripped_jungle_log_top.png";
import strippedJungleLogUrl from "../../assets/textures/stripped_jungle_log.png";
import strippedOakLogTopUrl from "../../assets/textures/stripped_oak_log_top.png";
import strippedOakLogUrl from "../../assets/textures/stripped_oak_log.png";
import stoneBricksUrl from "../../assets/textures/stone_bricks.png";
import stoneUrl from "../../assets/textures/stone.png";
import tuffUrl from "../../assets/textures/tuff.png";

/** `cutout` drops transparent pixels outright, so glass needs no draw ordering. */
export type BlockDraw = "solid" | "cutout";

/** Which drawer of the inventory a block appears in. */
export type BlockGroup = "Ground" | "Stone" | "Worked stone" | "Wood" | "Other";

export interface BlockType {
  /** Stored in saved builds, so these numbers must never be reused. */
  readonly id: number;
  readonly name: string;
  readonly label: string;
  readonly top: string;
  readonly side: string;
  readonly bottom: string;
  readonly draw: BlockDraw;
  /** True for blocks with a grain, which lie along the face they are placed against. */
  readonly directional: boolean;
  /** Which shapes a block gets is decided in blockIds.ts. */
  readonly slab: boolean;
  readonly stairs: boolean;
  readonly fence: boolean;
  readonly wall: boolean;
  /** Its trapdoor texture, or null. Minecraft draws a trapdoor as its own texture, not the block cut thin. */
  readonly trapdoor: string | null;
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
  trapdoor?: string;
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
    fence: FENCE_BLOCK_IDS.has(input.id),
    wall: WALL_BLOCK_IDS.has(input.id),
    trapdoor: input.trapdoor ?? null,
    group: input.group,
  };
}

/** One entry per placeable block. Everything else reads from here. */
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
  define({ id: BLOCK_IDS.mossBlock, name: "moss_block", label: "Moss Block", group: "Ground", texture: mossBlockUrl }),

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
  define({ id: BLOCK_IDS.mossyStoneBricks, name: "mossy_stone_bricks", label: "Mossy Stone Bricks", group: "Worked stone", texture: mossyStoneBricksUrl }),
  define({ id: BLOCK_IDS.quartz, name: "quartz_block", label: "Quartz Block", group: "Worked stone", top: quartzTopUrl, side: quartzSideUrl, bottom: quartzBottomUrl }),
  define({ id: BLOCK_IDS.deepslateBricks, name: "deepslate_bricks", label: "Deepslate Bricks", group: "Worked stone", texture: deepslateBricksUrl }),
  define({ id: BLOCK_IDS.polishedDeepslate, name: "polished_deepslate", label: "Polished Deepslate", group: "Worked stone", texture: polishedDeepslateUrl }),
  define({ id: BLOCK_IDS.smoothSandstone, name: "smooth_sandstone", label: "Smooth Sandstone", group: "Worked stone", texture: sandstoneTopUrl }),
  define({ id: BLOCK_IDS.oxidizedCutCopper, name: "oxidized_cut_copper", label: "Oxidized Cut Copper", group: "Worked stone", texture: oxidizedCutCopperUrl }),

  // Wood
  define({ id: BLOCK_IDS.oakLog, name: "oak_log", label: "Oak Log", group: "Wood", top: oakLogTopUrl, side: oakLogUrl, directional: true }),
  define({ id: BLOCK_IDS.oakPlanks, name: "oak_planks", label: "Oak Planks", group: "Wood", texture: oakPlanksUrl, trapdoor: oakTrapdoorUrl }),
  define({ id: BLOCK_IDS.oakLeaves, name: "oak_leaves", label: "Oak Leaves", group: "Wood", texture: oakLeavesUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.spruceLog, name: "spruce_log", label: "Spruce Log", group: "Wood", top: spruceLogTopUrl, side: spruceLogUrl, directional: true }),
  define({ id: BLOCK_IDS.sprucePlanks, name: "spruce_planks", label: "Spruce Planks", group: "Wood", texture: sprucePlanksUrl, trapdoor: spruceTrapdoorUrl }),
  define({ id: BLOCK_IDS.spruceLeaves, name: "spruce_leaves", label: "Spruce Leaves", group: "Wood", texture: spruceLeavesUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.birchLog, name: "birch_log", label: "Birch Log", group: "Wood", top: birchLogTopUrl, side: birchLogUrl, directional: true }),
  define({ id: BLOCK_IDS.birchPlanks, name: "birch_planks", label: "Birch Planks", group: "Wood", texture: birchPlanksUrl, trapdoor: birchTrapdoorUrl }),
  define({ id: BLOCK_IDS.birchLeaves, name: "birch_leaves", label: "Birch Leaves", group: "Wood", texture: birchLeavesUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.cherryLog, name: "cherry_log", label: "Cherry Log", group: "Wood", top: cherryLogTopUrl, side: cherryLogUrl, directional: true }),
  define({ id: BLOCK_IDS.cherryPlanks, name: "cherry_planks", label: "Cherry Planks", group: "Wood", texture: cherryPlanksUrl, trapdoor: cherryTrapdoorUrl }),
  define({ id: BLOCK_IDS.cherryLeaves, name: "cherry_leaves", label: "Cherry Leaves", group: "Wood", texture: cherryLeavesUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.strippedSpruceLog, name: "stripped_spruce_log", label: "Stripped Spruce Log", group: "Wood", top: strippedSpruceLogTopUrl, side: strippedSpruceLogUrl, directional: true }),
  define({ id: BLOCK_IDS.strippedDarkOakLog, name: "stripped_dark_oak_log", label: "Stripped Dark Oak Log", group: "Wood", top: strippedDarkOakLogTopUrl, side: strippedDarkOakLogUrl, directional: true }),
  define({ id: BLOCK_IDS.darkOakPlanks, name: "dark_oak_planks", label: "Dark Oak Planks", group: "Wood", texture: darkOakPlanksUrl, trapdoor: darkOakTrapdoorUrl }),
  define({ id: BLOCK_IDS.darkOakLog, name: "dark_oak_log", label: "Dark Oak Log", group: "Wood", top: darkOakLogTopUrl, side: darkOakLogUrl, directional: true }),
  define({ id: BLOCK_IDS.strippedOakLog, name: "stripped_oak_log", label: "Stripped Oak Log", group: "Wood", top: strippedOakLogTopUrl, side: strippedOakLogUrl, directional: true }),
  define({ id: BLOCK_IDS.strippedBirchLog, name: "stripped_birch_log", label: "Stripped Birch Log", group: "Wood", top: strippedBirchLogTopUrl, side: strippedBirchLogUrl, directional: true }),
  define({ id: BLOCK_IDS.strippedJungleLog, name: "stripped_jungle_log", label: "Stripped Jungle Log", group: "Wood", top: strippedJungleLogTopUrl, side: strippedJungleLogUrl, directional: true }),
  // Wood is bark on every face, so it has no grain to turn.
  define({ id: BLOCK_IDS.oakWood, name: "oak_wood", label: "Oak Wood", group: "Wood", texture: oakLogUrl }),
  define({ id: BLOCK_IDS.spruceWood, name: "spruce_wood", label: "Spruce Wood", group: "Wood", texture: spruceLogUrl }),
  define({ id: BLOCK_IDS.strippedSpruceWood, name: "stripped_spruce_wood", label: "Stripped Spruce Wood", group: "Wood", texture: strippedSpruceLogUrl }),
  define({ id: BLOCK_IDS.strippedDarkOakWood, name: "stripped_dark_oak_wood", label: "Stripped Dark Oak Wood", group: "Wood", texture: strippedDarkOakLogUrl }),
  define({ id: BLOCK_IDS.acaciaPlanks, name: "acacia_planks", label: "Acacia Planks", group: "Wood", texture: acaciaPlanksUrl, trapdoor: acaciaTrapdoorUrl }),
  define({ id: BLOCK_IDS.junglePlanks, name: "jungle_planks", label: "Jungle Planks", group: "Wood", texture: junglePlanksUrl, trapdoor: jungleTrapdoorUrl }),

  // Other
  define({ id: BLOCK_IDS.glass, name: "glass", label: "Glass", group: "Other", texture: glassUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.glassPane, name: "glass_pane", label: "Glass Pane", group: "Other", top: glassPaneTopUrl, side: glassUrl, bottom: glassPaneTopUrl, draw: "cutout" }),
  define({ id: BLOCK_IDS.hayBale, name: "hay_bale", label: "Hay Bale", group: "Other", top: hayBlockTopUrl, side: hayBlockSideUrl, directional: true }),
  define({ id: BLOCK_IDS.lightGrayConcrete, name: "light_gray_concrete", label: "Light Gray Concrete", group: "Other", texture: lightGrayConcreteUrl }),
  define({ id: BLOCK_IDS.grayConcrete, name: "gray_concrete", label: "Gray Concrete", group: "Other", texture: grayConcreteUrl }),
  define({ id: BLOCK_IDS.redConcrete, name: "red_concrete", label: "Red Concrete", group: "Other", texture: redConcreteUrl }),
  define({ id: BLOCK_IDS.orangeWool, name: "orange_wool", label: "Orange Wool", group: "Other", texture: orangeWoolUrl }),
  define({ id: BLOCK_IDS.limeWool, name: "lime_wool", label: "Lime Wool", group: "Other", texture: limeWoolUrl }),
  define({ id: BLOCK_IDS.barrel, name: "barrel", label: "Barrel", group: "Other", top: barrelTopUrl, side: barrelSideUrl, bottom: barrelBottomUrl, directional: true }),
  define({ id: BLOCK_IDS.brownMushroomBlock, name: "brown_mushroom_block", label: "Brown Mushroom Block", group: "Other", texture: brownMushroomBlockUrl }),
];

const BY_ID = new Map(BLOCKS.map((block) => [block.id, block]));

export function getBlock(id: number): BlockType | undefined {
  return BY_ID.get(id);
}

/** Every distinct texture the block table refers to, deduplicated. */
export const TEXTURE_URLS: readonly string[] = [
  ...new Set(
    BLOCKS.flatMap((block) => [
      block.top,
      block.side,
      block.bottom,
      ...(block.trapdoor ? [block.trapdoor] : []),
    ]),
  ),
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
