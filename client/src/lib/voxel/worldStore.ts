import { create } from "zustand";
import { BLOCKS, DEFAULT_BLOCK_ID, DEFAULT_HOTBAR, getBlock, type BlockType } from "./blocks.ts";
import {
  AXIS_Y,
  blockIdOf,
  FACING_NORTH,
  isSlab,
  isTrapdoor,
  packBlock,
  packTrapdoor,
  SHAPE_FENCE,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
  toggledTrapdoor,
} from "./blockValue.ts";
import { nextBrush, type Cell } from "./brush.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { generateTerrain, randomSeed, spawnPointFor, WORLD_SIZE } from "./terrain.ts";
import { deserializeWorld, serializeWorld } from "./format.ts";
import { computeVisible, refreshVisibleAround, type VisibleBlocks } from "./render.ts";

export const HOTBAR_SLOTS = 9;

/**
 * The whole world in one store. Terrain and placed blocks are the same thing and
 * share one map, so breaking either takes one code path.
 */
/** What a new world can be asked for, beyond its seed. */
export interface WorldOptions {
  size?: number;
  trees?: boolean;
}

/** The saved build a world was opened from, so saving can offer to overwrite it. */
export interface BuildSource {
  id: string;
  name: string;
}

interface WorldState {
  /** Null for a world that has never been saved, or was made fresh. */
  source: BuildSource | null;
  seed: number;
  /** Width of the world in blocks. One of WORLD_SIZES. */
  size: number;
  /** Whether this world was grown with trees. */
  trees: boolean;
  blocks: Map<BlockKey, number>;
  /**
   * The subset of `blocks` that is actually drawn, kept up to date as edits
   * happen rather than worked out again from the whole world each time.
   */
  visible: VisibleBlocks;
  /** Hotbar slot, 1 to HOTBAR_SLOTS. */
  selectedSlot: number;
  /**
   * Which block each hotbar slot holds. There are far more blocks than slots,
   * so the inventory writes into this rather than the hotbar being a fixed list.
   */
  hotbar: number[];
  /**
   * What shape each slot places. Alongside the hotbar rather than inside it, so
   * choosing a block and choosing how to place it stay separate.
   */
  hotbarShape: number[];
  /** How many cells across one break or place covers. One of BRUSH_SIZES. */
  brush: number;

  newWorld: (seed?: number, options?: WorldOptions) => void;
  loadBuild: (payload: string, source?: BuildSource) => boolean;
  setSource: (source: BuildSource | null) => void;
  serialize: () => string;

  placeBlock: (
    x: number,
    y: number,
    z: number,
    axis?: number,
    shape?: number,
    facing?: number,
    /** For a trapdoor, whether it goes across the upper half of the cell. */
    top?: boolean,
  ) => void;
  removeBlock: (x: number, y: number, z: number) => void;
  /**
   * The same two, over a list of cells. A brush covers up to eighty-one cells
   * at once, and doing them one at a time copied the world's block map once
   * per cell.
   */
  placeBlocks: (
    cells: Cell[],
    axis?: number,
    shape?: number,
    facing?: number,
    top?: boolean,
  ) => void;
  removeBlocks: (cells: Cell[]) => void;
  /** Join a slab with a second of the same block, making a whole one. */
  fillSlab: (x: number, y: number, z: number) => void;
  toggleTrapdoor: (x: number, y: number, z: number) => void;
  setSelectedSlot: (slot: number) => void;
  /** Move along the hotbar, wrapping at both ends. Used by the scroll wheel. */
  cycleSelectedSlot: (delta: number) => void;
  setHotbarBlock: (slot: number, blockId: number) => void;
  /** Step the selected slot on to the next shape it can place. */
  cycleSelectedShape: () => void;
  /** Step the brush up a size, or down for a negative direction. */
  cycleBrush: (direction: number) => void;
  /** Put the block being looked at into the hotbar, or select it if it is there. */
  pickBlock: (blockId: number, shape: number) => void;
  selectedBlockId: () => number;
  selectedShape: () => number;
  spawnPoint: () => [number, number, number];
}

/**
 * The shapes a block can take, in the order R steps through them.
 *
 * Each exists only for the blocks Minecraft gives it to. Slabs and stairs are
 * listed by their lower half, since which half one lands in comes from aim.
 */
export function shapesFor(block: BlockType | undefined): number[] {
  const shapes = [SHAPE_FULL];
  if (!block) return shapes;
  if (block.slab) shapes.push(SHAPE_SLAB_BOTTOM);
  if (block.stairs) shapes.push(SHAPE_STAIRS_BOTTOM);
  if (block.fence) shapes.push(SHAPE_FENCE);
  if (block.wall) shapes.push(SHAPE_WALL);
  if (block.trapdoor) shapes.push(SHAPE_TRAPDOOR);
  return shapes;
}

/**
 * The shape this block can actually take, falling back to something it can. A
 * stair asked of a block that only has a slab becomes a slab.
 */
function shapeFor(block: BlockType | undefined, shape: number): number {
  const listedAs =
    shape === SHAPE_SLAB_TOP ? SHAPE_SLAB_BOTTOM : shape === SHAPE_STAIRS_TOP ? SHAPE_STAIRS_BOTTOM : shape;
  if (shapesFor(block).includes(listedAs)) return shape;
  if (listedAs === SHAPE_STAIRS_BOTTOM && block?.slab) return SHAPE_SLAB_BOTTOM;
  return SHAPE_FULL;
}

const initialSeed = randomSeed();
const initialBlocks = generateTerrain(initialSeed);

export const useWorldStore = create<WorldState>((set, get) => ({
  source: null,
  seed: initialSeed,
  size: WORLD_SIZE,
  trees: true,
  blocks: initialBlocks,
  visible: computeVisible(initialBlocks),
  selectedSlot: 1,
  hotbar: [...DEFAULT_HOTBAR],
  hotbarShape: Array.from({ length: HOTBAR_SLOTS }, () => SHAPE_FULL),
  brush: 1,

  newWorld: (seed = randomSeed(), options = {}) => {
    const { size = WORLD_SIZE, trees = true } = options;
    const blocks = generateTerrain(seed, size, { trees });
    set({ source: null, seed, size, trees, blocks, visible: computeVisible(blocks) });
  },

  loadBuild: (payload, source = undefined) => {
    const world = deserializeWorld(payload);
    if (!world) return false;
    set({
      source: source ?? null,
      seed: world.seed,
      size: world.size,
      trees: world.trees,
      blocks: world.blocks,
      visible: computeVisible(world.blocks),
    });
    return true;
  },

  setSource: (source) => set({ source }),

  serialize: () => {
    const { seed, blocks, size, trees } = get();
    return serializeWorld(seed, blocks, size, trees);
  },

  placeBlock: (x, y, z, axis, shape, facing, top) => {
    get().placeBlocks([[x, y, z]], axis, shape, facing, top);
  },

  placeBlocks: (
    cells,
    axis = AXIS_Y,
    shape = get().selectedShape(),
    facing = FACING_NORTH,
    top = false,
  ) => {
    const blockId = get().selectedBlockId();
    const block = getBlock(blockId);
    // Only a block with a grain is turned by the face you built against, and a
    // cut block is never turned: there is no shape here for one on its end.
    const cut = shapeFor(block, shape);
    const upright = cut !== SHAPE_FULL || !block?.directional;
    const value =
      cut === SHAPE_TRAPDOOR
        ? packTrapdoor(blockId, facing, top, false)
        : packBlock(blockId, upright ? AXIS_Y : axis, cut, facing);
    set((state) => {
      const empty = cells.filter(([x, y, z]) => !state.blocks.has(toKey(x, y, z)));
      if (empty.length === 0) return state;
      // Copying a map of a few thousand entries costs well under a millisecond
      // and only happens on an edit, never per frame. It keeps the update
      // obviously correct without a revision counter.
      const blocks = new Map(state.blocks);
      const visible = new Map(state.visible);
      for (const [x, y, z] of empty) {
        blocks.set(toKey(x, y, z), value);
        refreshVisibleAround(blocks, visible, x, y, z);
      }
      return { blocks, visible };
    });
  },

  fillSlab: (x, y, z) => {
    const key = toKey(x, y, z);
    set((state) => {
      const existing = state.blocks.get(key);
      if (existing === undefined || !isSlab(existing)) return state;
      const blocks = new Map(state.blocks);
      blocks.set(key, packBlock(blockIdOf(existing)));
      const visible = new Map(state.visible);
      refreshVisibleAround(blocks, visible, x, y, z);
      return { blocks, visible };
    });
  },

  toggleTrapdoor: (x, y, z) => {
    const key = toKey(x, y, z);
    set((state) => {
      const existing = state.blocks.get(key);
      if (existing === undefined || !isTrapdoor(existing)) return state;
      const blocks = new Map(state.blocks);
      blocks.set(key, toggledTrapdoor(existing));
      const visible = new Map(state.visible);
      refreshVisibleAround(blocks, visible, x, y, z);
      return { blocks, visible };
    });
  },

  removeBlock: (x, y, z) => {
    get().removeBlocks([[x, y, z]]);
  },

  removeBlocks: (cells) => {
    set((state) => {
      const filled = cells.filter(([x, y, z]) => state.blocks.has(toKey(x, y, z)));
      if (filled.length === 0) return state;
      const blocks = new Map(state.blocks);
      const visible = new Map(state.visible);
      for (const [x, y, z] of filled) {
        blocks.delete(toKey(x, y, z));
        refreshVisibleAround(blocks, visible, x, y, z);
      }
      return { blocks, visible };
    });
  },

  setSelectedSlot: (slot) => {
    if (slot >= 1 && slot <= HOTBAR_SLOTS) set({ selectedSlot: slot });
  },

  cycleSelectedSlot: (delta) => {
    set((state) => {
      // Written as a positive remainder so scrolling up off slot 1 lands on the
      // last slot rather than on zero.
      const zeroBased = (state.selectedSlot - 1 + delta) % HOTBAR_SLOTS;
      const wrapped = (zeroBased + HOTBAR_SLOTS) % HOTBAR_SLOTS;
      return { selectedSlot: wrapped + 1 };
    });
  },

  setHotbarBlock: (slot, blockId) => {
    if (slot < 1 || slot > HOTBAR_SLOTS) return;
    if (!getBlock(blockId)) return;
    set((state) => {
      const hotbar = [...state.hotbar];
      hotbar[slot - 1] = blockId;
      // A slot left on a shape the new block cannot take is unplaceable.
      const hotbarShape = [...state.hotbarShape];
      const index = slot - 1;
      hotbarShape[index] = shapeFor(getBlock(blockId), hotbarShape[index] ?? SHAPE_FULL);
      return { hotbar, hotbarShape };
    });
  },

  cycleSelectedShape: () => {
    const order = shapesFor(getBlock(get().selectedBlockId()));
    if (order.length < 2) return;
    set((state) => {
      const hotbarShape = [...state.hotbarShape];
      const index = state.selectedSlot - 1;
      // Which half of the cell it lands in, which way it faces and what it
      // joins all come from where the player aims, not from here.
      const at = order.indexOf(hotbarShape[index] ?? SHAPE_FULL);
      hotbarShape[index] = order[(at + 1) % order.length]!;
      return { hotbarShape };
    });
  },

  cycleBrush: (direction) => {
    set((state) => ({ brush: nextBrush(state.brush, direction) }));
  },

  pickBlock: (blockId, shape) => {
    const block = getBlock(blockId);
    if (!block) return;
    // The hotbar lists a slab or a stair by its lower half whichever half was
    // placed, so an upside-down stair picks up as the stair already in the bar
    // rather than as something the bar has no room for.
    const listed =
      shape === SHAPE_SLAB_TOP
        ? SHAPE_SLAB_BOTTOM
        : shape === SHAPE_STAIRS_TOP
          ? SHAPE_STAIRS_BOTTOM
          : shape;
    const wanted = shapeFor(block, listed);
    set((state) => {
      const already = state.hotbar.findIndex(
        (id, index) => id === blockId && (state.hotbarShape[index] ?? SHAPE_FULL) === wanted,
      );
      if (already !== -1) return { selectedSlot: already + 1 };
      const hotbar = [...state.hotbar];
      const hotbarShape = [...state.hotbarShape];
      hotbar[state.selectedSlot - 1] = blockId;
      hotbarShape[state.selectedSlot - 1] = wanted;
      return { hotbar, hotbarShape };
    });
  },

  selectedBlockId: () => get().hotbar[get().selectedSlot - 1] ?? DEFAULT_BLOCK_ID,

  selectedShape: () => get().hotbarShape[get().selectedSlot - 1] ?? SHAPE_FULL,

  spawnPoint: () => spawnPointFor(get().blocks),
}));

/** Every block, in the order the inventory shows them. */
export const INVENTORY_BLOCKS = BLOCKS;
