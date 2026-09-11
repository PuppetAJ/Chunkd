import { createNoise2D } from "simplex-noise";
import alea from "alea";
import { toKey, type BlockKey } from "./coords.ts";
import { collides } from "./collision.ts";
import { BLOCK_IDS } from "./blockIds.ts";
import { blockIdOf } from "./blockValue.ts";

/**
 * Width and depth of the world, in blocks.
 *
 * Measured at 64: about 22,000 blocks, of which roughly 9,000 are visible and
 * drawn. Recomputing what is visible after each edit costs about 8 ms, which
 * fits inside a frame. It rises to 33 ms at 128, which would stutter, so going
 * larger needs the visibility pass to update only around the block that
 * changed rather than rebuilding the whole world.
 */
export const WORLD_SIZE = 64;

/**
 * The widths the editor offers, in blocks. There is no chunking here: a world
 * is generated whole and held as one map, so this is simply how far it goes.
 *
 * Bigger is not free. The widest is around half a million blocks and takes
 * roughly a second to generate and cull, so it wants a loading state rather
 * than being the silent default.
 */
export const WORLD_SIZES = [WORLD_SIZE, WORLD_SIZE * 2, WORLD_SIZE * 3] as const;

/** What can be turned off when generating a world. */
export interface TerrainOptions {
  /** Plant trees. Off gives bare ground to build on. */
  trees?: boolean;
}

/**
 * The shape of the land.
 *
 * The first version sampled one octave of noise at a fairly high frequency,
 * which is why the ground was uniformly lumpy: every hill was the same size and
 * there was nowhere flat. This stacks four octaves, each twice the frequency
 * and half the height of the one before, so broad landforms carry small details
 * on top of them. A separate very low frequency sample then decides how hilly
 * each region is, which is what produces flat ground in some places and rougher
 * ground in others rather than the same texture everywhere.
 */
const OCTAVES = 4;
const BASE_FREQUENCY = 0.016;
/** How much the frequency rises per octave. */
const LACUNARITY = 2;
/** How much the height falls per octave. */
const GAIN = 0.5;

const BASE_HEIGHT = 12;
const RELIEF = 22;
/** How flat the flattest regions are, as a fraction of full relief. */
const MIN_RELIEF = 0.25;

/** Below this the ground is beach rather than grass. */
const SAND_LEVEL = 5;
/** Above this it is snow. */
const SNOW_LEVEL = 17;
/** How deep the soil is before stone starts. */
const SOIL_DEPTH = 4;

export interface HeightField {
  (x: number, z: number): number;
}

/**
 * Surface height as a function of position, for one seed.
 *
 * Built once and shared, because both terrain generation and working out where
 * to drop the player need it and they must agree.
 */
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
    // Slow enough that a region keeps the same character for many blocks.
    const local = (roughness(x * 0.008, z * 0.008) + 1) / 2;
    const relief = RELIEF * (MIN_RELIEF + (1 - MIN_RELIEF) * local);

    return Math.round(BASE_HEIGHT + shape * relief);
  };
}

/** Which block the very top of a column should be. */
function surfaceBlock(height: number): number {
  if (height <= SAND_LEVEL) return BLOCK_IDS.sand;
  if (height >= SNOW_LEVEL) return BLOCK_IDS.snowyGrass;
  return BLOCK_IDS.grass;
}

/** Which block sits just under the surface. */
function subsoilBlock(height: number): number {
  return height <= SAND_LEVEL ? BLOCK_IDS.sand : BLOCK_IDS.dirt;
}

interface TreeKind {
  log: number;
  leaves: number;
}

/**
 * The trees the generator plants.
 *
 * Spruce is deliberately absent. Its blocks are still in the inventory to build
 * with, but the narrow conical conifer the generator grew from them looked wrong
 * next to the rounded ones, so it is no longer planted.
 */
const TREE_KINDS: TreeKind[] = [
  { log: BLOCK_IDS.oakLog, leaves: BLOCK_IDS.oakLeaves },
  { log: BLOCK_IDS.birchLog, leaves: BLOCK_IDS.birchLeaves },
  { log: BLOCK_IDS.cherryLog, leaves: BLOCK_IDS.cherryLeaves },
];

/** Roughly one candidate per this many columns. */
const TREE_CHANCE = 1 / 70;
/** Trees closer together than this look like a hedge rather than a wood. */
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
  // Two wide rings around the upper trunk, then a small cap, which is the
  // familiar rounded canopy without needing a real sphere.
  for (let dy = -2; dy <= 1; dy += 1) {
    const radius = dy <= -1 ? 2 : 1;
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        // Clip the corners of the wide rings so the canopy is not a cube, and
        // the corners of the top ring as well so it finishes in a cross rather
        // than a flat square, which is the shape Minecraft's oak has.
        const isCorner = Math.abs(dx) === radius && Math.abs(dz) === radius;
        if (isCorner && (radius === 2 || dy === 1)) continue;
        const key = toKey(x + dx, top + dy, z + dz);
        if (!blocks.has(key)) blocks.set(key, kind.leaves);
      }
    }
  }
}

/**
 * Build the starting world for a seed.
 *
 * The same seed always produces the same world, which is what lets a saved build
 * be stored as a seed plus the handful of blocks the player changed, rather than
 * as every block in the world. Trees are part of that, so they are placed from
 * the seed too and never from Math.random.
 *
 * The old generator only filled the surface, a one-block floor and hollow walls,
 * so digging down revealed an empty shell. Each column is filled all the way to
 * the floor: soil near the top, stone under it.
 */
export function generateTerrain(
  seed: number,
  size: number = WORLD_SIZE,
  options: TerrainOptions = {},
): Map<BlockKey, number> {
  const { trees = true } = options;
  const heightAt = createHeightField(seed);
  const blocks = new Map<BlockKey, number>();

  // Preallocated deliberately. The grid is filled by index below, and the
  // size is known, so growing the array element by element is wasted work.
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

  // Trees are placed after the ground exists so they can read its height and
  // its slope, and so a trunk is never buried by the column it stands on.
  const rng = alea(seed, "trees");
  const planted: [number, number][] = [];

  for (let x = 2; x < size - 2; x += 1) {
    for (let z = 2; z < size - 2; z += 1) {
      if (rng() > TREE_CHANCE) continue;

      const ground = heights[x * size + z]!;
      if (ground <= SAND_LEVEL || ground >= SNOW_LEVEL) continue;

      // Nothing grows on a slope steep enough that the trunk would hang in the
      // air on one side.
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

/** Nothing generated reaches this high, so scanning down from it finds the top. */
const SEARCH_CEILING = 80;

/** Blocks a tree is made of. The player should not be dropped onto a treetop. */
const TREE_BLOCK_IDS: ReadonlySet<number> = new Set(
  TREE_KINDS.flatMap((kind) => [kind.log, kind.leaves]),
);

/** Columns starting at the middle and spiralling outward, as a square ring walk. */
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

/**
 * A safe place to drop the player in: standing on the ground near the middle of
 * the world, in a column where they actually fit.
 *
 * This used to be worked out from the height field alone, which knows about the
 * landscape but not about anything standing on it. Once the generator started
 * planting trees that became a real problem: on about one seed in five the
 * player appeared inside a canopy, and being inside a block meant collision was
 * skipped, so they fell straight through the world. Dropping back through the
 * void respawned them in the same place, so it never recovered.
 *
 * Working from the finished world instead means the check is simply whether the
 * player's own box is clear.
 */
export function spawnPointFor(
  blocks: Map<BlockKey, number>,
  size: number = WORLD_SIZE,
): [number, number, number] {
  for (const [x, z] of columnsFromMiddle(size)) {
    let ground = -1;
    for (let y = SEARCH_CEILING; y >= 0; y -= 1) {
      const block = blocks.get(toKey(x, y, z));
      if (block === undefined) continue;
      // Skip the whole column if its top is a tree, rather than standing the
      // player on a canopy.
      if (TREE_BLOCK_IDS.has(blockIdOf(block))) break;
      ground = y;
      break;
    }
    if (ground < 0) continue;

    // A block at `ground` fills up to ground + 0.5, which is where feet rest.
    const feet = ground + 0.5;
    if (!collides(blocks, x + 0.5, feet, z + 0.5)) return [x + 0.5, feet, z + 0.5];
  }

  // Nowhere at all was clear, which should not happen; drop in above the middle.
  const middle = Math.floor(size / 2);
  return [middle + 0.5, SEARCH_CEILING, middle + 0.5];
}
