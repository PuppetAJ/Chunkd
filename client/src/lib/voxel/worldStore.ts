import { create } from "zustand";
import { BLOCKS, DEFAULT_BLOCK_ID, DEFAULT_HOTBAR, getBlock } from "./blocks.ts";
import { AXIS_Y, packBlock, SHAPE_FULL, SHAPE_SLAB_BOTTOM } from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { generateTerrain, randomSeed, spawnPointFor } from "./terrain.ts";
import { deserializeWorld, serializeWorld } from "./format.ts";
import { computeVisible, refreshVisibleAround, type VisibleBlocks } from "./render.ts";

export const HOTBAR_SLOTS = 9;

/**
 * The whole world in one store.
 *
 * The previous version kept three: generated terrain in one, player-placed
 * cubes in another, and the selected block in a third. Terrain and placed
 * blocks were then rendered by completely different components, which is why
 * breaking a placed block and breaking a terrain block took separate code
 * paths. They are the same thing and now live in the same map.
 */
interface WorldState {
  seed: number;
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

  newWorld: (seed?: number) => void;
  loadBuild: (payload: string) => boolean;
  serialize: () => string;

  placeBlock: (x: number, y: number, z: number, axis?: number, shape?: number) => void;
  removeBlock: (x: number, y: number, z: number) => void;
  setSelectedSlot: (slot: number) => void;
  /** Move along the hotbar, wrapping at both ends. Used by the scroll wheel. */
  cycleSelectedSlot: (delta: number) => void;
  setHotbarBlock: (slot: number, blockId: number) => void;
  /** Swap the selected slot between placing a full cube and placing a slab. */
  toggleSelectedShape: () => void;
  selectedBlockId: () => number;
  selectedShape: () => number;
  spawnPoint: () => [number, number, number];
}

const initialSeed = randomSeed();
const initialBlocks = generateTerrain(initialSeed);

export const useWorldStore = create<WorldState>((set, get) => ({
  seed: initialSeed,
  blocks: initialBlocks,
  visible: computeVisible(initialBlocks),
  selectedSlot: 1,
  hotbar: [...DEFAULT_HOTBAR],
  hotbarShape: Array.from({ length: HOTBAR_SLOTS }, () => SHAPE_FULL),

  newWorld: (seed = randomSeed()) => {
    const blocks = generateTerrain(seed);
    set({ seed, blocks, visible: computeVisible(blocks) });
  },

  loadBuild: (payload: string) => {
    const world = deserializeWorld(payload);
    if (!world) return false;
    set({ seed: world.seed, blocks: world.blocks, visible: computeVisible(world.blocks) });
    return true;
  },

  serialize: () => serializeWorld(get().seed, get().blocks),

  placeBlock: (x, y, z, axis = AXIS_Y, shape = get().selectedShape()) => {
    const blockId = get().selectedBlockId();
    const block = getBlock(blockId);
    // Only a block with a grain is turned by the face you built against, and a
    // slab is never turned: there is no shape here for one stood on its end.
    const upright = shape !== SHAPE_FULL || !block?.directional;
    const value = packBlock(blockId, upright ? AXIS_Y : axis, shape);
    const key = toKey(x, y, z);
    set((state) => {
      if (state.blocks.has(key)) return state;
      // Copying a map of a few thousand entries costs well under a millisecond
      // and only happens on an edit, never per frame. It keeps the update
      // obviously correct without a revision counter.
      const blocks = new Map(state.blocks);
      blocks.set(key, value);
      const visible = new Map(state.visible);
      refreshVisibleAround(blocks, visible, x, y, z);
      return { blocks, visible };
    });
  },

  removeBlock: (x, y, z) => {
    const key = toKey(x, y, z);
    set((state) => {
      if (!state.blocks.has(key)) return state;
      const blocks = new Map(state.blocks);
      blocks.delete(key);
      const visible = new Map(state.visible);
      refreshVisibleAround(blocks, visible, x, y, z);
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
      return { hotbar };
    });
  },

  toggleSelectedShape: () => {
    set((state) => {
      const hotbarShape = [...state.hotbarShape];
      const index = state.selectedSlot - 1;
      // Which half of the cell a slab lands in comes from where they aim.
      hotbarShape[index] =
        hotbarShape[index] === SHAPE_FULL ? SHAPE_SLAB_BOTTOM : SHAPE_FULL;
      return { hotbarShape };
    });
  },

  selectedBlockId: () => get().hotbar[get().selectedSlot - 1] ?? DEFAULT_BLOCK_ID,

  selectedShape: () => get().hotbarShape[get().selectedSlot - 1] ?? SHAPE_FULL,

  spawnPoint: () => spawnPointFor(get().blocks),
}));

/** Every block, in the order the inventory shows them. */
export const INVENTORY_BLOCKS = BLOCKS;
