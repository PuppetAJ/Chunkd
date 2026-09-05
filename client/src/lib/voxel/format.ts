import { z } from "zod";
import { generateTerrain, WORLD_SIZE } from "./terrain.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

/**
 * Saved build format, version 2.
 *
 * Version 1 was the whole world written out as JSON, every block position
 * included, which is why a single save ran to megabytes and the API had to
 * accept 50 MB request bodies.
 *
 * This stores the seed instead. The terrain is regenerated on load and only the
 * differences are recorded: blocks the player removed, and blocks they added.
 * A build is therefore proportional to what the player actually did rather than
 * to the size of the world.
 */
export const BUILD_FORMAT_VERSION = 2;

const positionSchema = z.tuple([z.number().int(), z.number().int(), z.number().int()]);

const buildSchema = z.object({
  v: z.literal(BUILD_FORMAT_VERSION),
  size: z.number().int().positive(),
  seed: z.number().int().nonnegative(),
  removed: z.array(positionSchema),
  added: z.array(z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()])),
});

export type SavedBuild = z.infer<typeof buildSchema>;

/** Reduce a live world to the differences from its generated terrain. */
export function serializeWorld(seed: number, blocks: Map<BlockKey, number>): string {
  const original = generateTerrain(seed);

  const removed: [number, number, number][] = [];
  const added: [number, number, number, number][] = [];

  for (const key of original.keys()) {
    if (!blocks.has(key)) removed.push(fromKey(key));
  }

  for (const [key, id] of blocks) {
    if (original.get(key) !== id) {
      const [x, y, z] = fromKey(key);
      added.push([x, y, z, id]);
    }
  }

  const build: SavedBuild = {
    v: BUILD_FORMAT_VERSION,
    size: WORLD_SIZE,
    seed,
    removed,
    added,
  };

  return JSON.stringify(build);
}

export interface LoadedWorld {
  seed: number;
  blocks: Map<BlockKey, number>;
}

/**
 * Rebuild a world from a saved payload.
 *
 * Returns null rather than throwing when the data is unreadable, so a corrupt or
 * outdated build shows a message instead of taking down the page.
 */
export function deserializeWorld(payload: string): LoadedWorld | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  const result = buildSchema.safeParse(parsed);
  if (!result.success) return null;

  const { seed, removed, added } = result.data;
  const blocks = generateTerrain(seed);

  for (const [x, y, z] of removed) blocks.delete(toKey(x, y, z));
  for (const [x, y, z, id] of added) blocks.set(toKey(x, y, z), id);

  return { seed, blocks };
}
