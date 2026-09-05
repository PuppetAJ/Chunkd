import { createNoise2D } from "simplex-noise";
import alea from "alea";
import { toKey, type BlockKey } from "./coords.ts";
import { BLOCKS } from "./blocks.ts";

export const WORLD_SIZE = 32;

const GRASS = BLOCKS.find((block) => block.name === "grass")!.id;
const DIRT = BLOCKS.find((block) => block.name === "dirt")!.id;

const NOISE_STEP = 0.05;
const AMPLITUDE = 35;
const BASE_HEIGHT = 4;

/** Surface height at a column, for the given seed. */
function columnHeight(noise2D: (x: number, y: number) => number, x: number, z: number): number {
  return Math.round((noise2D(x * NOISE_STEP, z * NOISE_STEP) * AMPLITUDE) / 5) + BASE_HEIGHT;
}

/**
 * Build the starting world for a seed.
 *
 * The same seed always produces the same world, which is what lets a saved build
 * be stored as a seed plus the handful of blocks the player changed, rather than
 * as every block in the world.
 *
 * The old generator only filled the surface, a one-block floor and hollow walls,
 * so digging down revealed an empty shell. This fills each column from the
 * surface down to the floor with dirt, which costs nothing to generate and is
 * what a player expects when they dig.
 */
export function generateTerrain(seed: number): Map<BlockKey, number> {
  const noise2D = createNoise2D(alea(seed));
  const blocks = new Map<BlockKey, number>();

  for (let x = 0; x < WORLD_SIZE; x += 1) {
    for (let z = 0; z < WORLD_SIZE; z += 1) {
      const height = columnHeight(noise2D, x, z);
      blocks.set(toKey(x, height, z), GRASS);
      for (let y = height - 1; y >= 0; y -= 1) {
        blocks.set(toKey(x, y, z), DIRT);
      }
    }
  }

  return blocks;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * A safe place to drop the player in, just above the surface at the middle of
 * the world. Spawning at a fixed height meant falling through the air, or worse,
 * spawning inside a hill.
 */
export function spawnPointFor(seed: number): [number, number, number] {
  const noise2D = createNoise2D(alea(seed));
  const middle = Math.floor(WORLD_SIZE / 2);
  return [middle + 0.5, columnHeight(noise2D, middle, middle) + 3, middle + 0.5];
}
