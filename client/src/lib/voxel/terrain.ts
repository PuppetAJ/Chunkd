import { createNoise2D } from "simplex-noise";
import alea from "alea";
import { toKey, type BlockKey } from "./coords.ts";
import { collides } from "./collision.ts";
import { BLOCK_IDS } from "./blockIds.ts";
import { blockIdOf } from "./blockValue.ts";

export const WORLD_SIZE = 64;

export const WORLD_SIZES = [WORLD_SIZE, WORLD_SIZE * 2, WORLD_SIZE * 3] as const;

export interface TerrainOptions {
  trees?: boolean;
}

const OCTAVES = 4;
const BASE_FREQUENCY = 0.016;
const LACUNARITY = 2;
const GAIN = 0.5;

const BASE_HEIGHT = 12;
const RELIEF = 22;
const MIN_RELIEF = 0.25;

const SAND_LEVEL = 5;
const SNOW_LEVEL = 17;
const SOIL_DEPTH = 4;

export interface HeightField {
  (x: number, z: number): number;
}

export function createHeightField(seed: number): HeightField {
  const land = createNoise2D(alea(seed, "land"));
  const roughness = createNoise2D(alea(seed, "roughness"));

  return (x: number, z: number): number => {
    let total = 0;
    let amplitude = 1;
    let frequency = BASE_FREQUENCY;
    let maximum = 0;

    for (let octave = 0; octave < OCTAVES; octave += 1) {
      total += land(x * frequency, z * frequency) * amplitude;
      maximum += amplitude;
      amplitude *= GAIN;
      frequency *= LACUNARITY;
    }

    const shape = total / maximum;
    const local = (roughness(x * 0.008, z * 0.008) + 1) / 2;
    const relief = RELIEF * (MIN_RELIEF + (1 - MIN_RELIEF) * local);

    return Math.round(BASE_HEIGHT + shape * relief);
  };
}

function surfaceBlock(height: number): number {
  if (height <= SAND_LEVEL) return BLOCK_IDS.sand;
  if (height >= SNOW_LEVEL) return BLOCK_IDS.snowyGrass;
  return BLOCK_IDS.grass;
}

function subsoilBlock(height: number): number {
  return height <= SAND_LEVEL ? BLOCK_IDS.sand : BLOCK_IDS.dirt;
}

interface TreeKind {
  log: number;
  leaves: number;
}

const TREE_KINDS: TreeKind[] = [
  { log: BLOCK_IDS.oakLog, leaves: BLOCK_IDS.oakLeaves },
  { log: BLOCK_IDS.birchLog, leaves: BLOCK_IDS.birchLeaves },
  { log: BLOCK_IDS.cherryLog, leaves: BLOCK_IDS.cherryLeaves },
];

const TREE_CHANCE = 1 / 70;
const TREE_SPACING = 5;

function plantTree(
  blocks: Map<BlockKey, number>,
  kind: TreeKind,
  x: number,
  ground: number,
  z: number,
  trunk: number,
): void {
  for (let y = 1; y <= trunk; y += 1) blocks.set(toKey(x, ground + y, z), kind.log);

  const top = ground + trunk;
  for (let dy = -2; dy <= 1; dy += 1) {
    const radius = dy <= -1 ? 2 : 1;
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        const isCorner = Math.abs(dx) === radius && Math.abs(dz) === radius;
        if (isCorner && (radius === 2 || dy === 1)) continue;
        const key = toKey(x + dx, top + dy, z + dz);
        if (!blocks.has(key)) blocks.set(key, kind.leaves);
      }
    }
  }
}

export function generateTerrain(
  seed: number,
  size: number = WORLD_SIZE,
  options: TerrainOptions = {},
): Map<BlockKey, number> {
  const { trees = true } = options;
  const heightAt = createHeightField(seed);
  const blocks = new Map<BlockKey, number>();

  // oxlint-disable-next-line no-new-array
  const heights: number[] = new Array(size * size);
  for (let x = 0; x < size; x += 1) {
    for (let z = 0; z < size; z += 1) {
      const height = heightAt(x, z);
      heights[x * size + z] = height;

      blocks.set(toKey(x, height, z), surfaceBlock(height));
      for (let y = height - 1; y >= 0; y -= 1) {
        blocks.set(toKey(x, y, z), height - y <= SOIL_DEPTH ? subsoilBlock(height) : BLOCK_IDS.stone);
      }
    }
  }

  if (!trees) return blocks;

  const rng = alea(seed, "trees");
  const planted: [number, number][] = [];

  for (let x = 2; x < size - 2; x += 1) {
    for (let z = 2; z < size - 2; z += 1) {
      if (rng() > TREE_CHANCE) continue;

      const ground = heights[x * size + z]!;
      if (ground <= SAND_LEVEL || ground >= SNOW_LEVEL) continue;

      const north = heights[x * size + (z - 1)]!;
      const south = heights[x * size + (z + 1)]!;
      const east = heights[(x + 1) * size + z]!;
      const west = heights[(x - 1) * size + z]!;
      const highest = Math.max(north, south, east, west);
      const lowest = Math.min(north, south, east, west);
      if (highest - lowest > 1 || Math.abs(highest - ground) > 1) continue;

      const tooClose = planted.some(
        ([px, pz]) => Math.abs(px - x) < TREE_SPACING && Math.abs(pz - z) < TREE_SPACING,
      );
      if (tooClose) continue;

      const kind = TREE_KINDS[Math.floor(rng() * TREE_KINDS.length)]!;
      const trunk = 4 + Math.floor(rng() * 2);
      plantTree(blocks, kind, x, ground, z, trunk);
      planted.push([x, z]);
    }
  }

  return blocks;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

const SEARCH_CEILING = 80;

const TREE_BLOCK_IDS: ReadonlySet<number> = new Set(
  TREE_KINDS.flatMap((kind) => [kind.log, kind.leaves]),
);

function* columnsFromMiddle(size: number): Generator<[number, number]> {
  const middle = Math.floor(size / 2);
  yield [middle, middle];
  for (let ring = 1; ring < middle; ring += 1) {
    for (let offset = -ring; offset <= ring; offset += 1) {
      yield [middle + offset, middle - ring];
      yield [middle + offset, middle + ring];
      yield [middle - ring, middle + offset];
      yield [middle + ring, middle + offset];
    }
  }
}

export function spawnPointFor(
  blocks: Map<BlockKey, number>,
  size: number = WORLD_SIZE,
): [number, number, number] {
  for (const [x, z] of columnsFromMiddle(size)) {
    let ground = -1;
    for (let y = SEARCH_CEILING; y >= 0; y -= 1) {
      const block = blocks.get(toKey(x, y, z));
      if (block === undefined) continue;
      if (TREE_BLOCK_IDS.has(blockIdOf(block))) break;
      ground = y;
      break;
    }
    if (ground < 0) continue;

    const feet = ground + 0.5;
    if (!collides(blocks, x + 0.5, feet, z + 0.5)) return [x + 0.5, feet, z + 0.5];
  }

  const middle = Math.floor(size / 2);
  return [middle + 0.5, SEARCH_CEILING, middle + 0.5];
}
