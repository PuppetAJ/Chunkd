import { create } from "zustand";
import { BLOCKS, DEFAULT_BLOCK_ID, blockForSlot } from "./blocks.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { generateTerrain, randomSeed, spawnPointFor } from "./terrain.ts";
import { deserializeWorld, serializeWorld } from "./format.ts";

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
  /** Hotbar slot, 1 to 9. */
  selectedSlot: number;

  newWorld: (seed?: number) => void;
  loadBuild: (payload: string) => boolean;
  serialize: () => string;

  placeBlock: (x: number, y: number, z: number) => void;
  removeBlock: (x: number, y: number, z: number) => void;
  setSelectedSlot: (slot: number) => void;
  spawnPoint: () => [number, number, number];
}

const initialSeed = randomSeed();

export const useWorldStore = create<WorldState>((set, get) => ({
  seed: initialSeed,
  blocks: generateTerrain(initialSeed),
  selectedSlot: 1,

  newWorld: (seed = randomSeed()) => {
    set({ seed, blocks: generateTerrain(seed) });
  },

  loadBuild: (payload: string) => {
    const world = deserializeWorld(payload);
    if (!world) return false;
    set({ seed: world.seed, blocks: world.blocks });
    return true;
  },

  serialize: () => serializeWorld(get().seed, get().blocks),

  placeBlock: (x, y, z) => {
    const block = blockForSlot(get().selectedSlot);
    const key = toKey(x, y, z);
    set((state) => {
      if (state.blocks.has(key)) return state;
      // Copying a map of a few thousand entries costs well under a millisecond
      // and only happens on an edit, never per frame. It keeps the update
      // obviously correct without a revision counter.
      const blocks = new Map(state.blocks);
      blocks.set(key, block?.id ?? DEFAULT_BLOCK_ID);
      return { blocks };
    });
  },

  removeBlock: (x, y, z) => {
    const key = toKey(x, y, z);
    set((state) => {
      if (!state.blocks.has(key)) return state;
      const blocks = new Map(state.blocks);
      blocks.delete(key);
      return { blocks };
    });
  },

  setSelectedSlot: (slot) => {
    if (slot >= 1 && slot <= BLOCKS.length) set({ selectedSlot: slot });
  },

  spawnPoint: () => spawnPointFor(get().seed),
}));
