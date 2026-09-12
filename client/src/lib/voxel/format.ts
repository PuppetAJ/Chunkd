import { z } from "zod";
import { generateTerrain, WORLD_SIZE } from "./terrain.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

/**
 * Saved build format, version 5.
 *
 * A save is the seed plus the differences: blocks the player removed and blocks
 * they added. The terrain is regenerated on load, so a build is proportional to
 * what the player did rather than to the size of the world.
 *
 * The version rises whenever a payload needs a reader that knows something new,
 * even when the shape of the file has not changed. Every older version is still
 * readable, because each new field defaults to what the old data meant: no shape
 * bits is a full cube (3), no `trees` field is a world grown with them (4), and
 * no trapdoor bits is a build without trapdoors (5). The generator's inputs, the
 * seed, the size and `trees`, all have to be stored: without them the terrain a
 * build is a difference against cannot be rebuilt.
 */
export const BUILD_FORMAT_VERSION = 5;

/**
 * The versions this can load. A list rather than "anything up to the current
 * one", so keeping an old version readable stays a decision.
 */
const READABLE_VERSIONS = [2, 3, 4, 5] as const;

const positionSchema = z.tuple([z.number().int(), z.number().int(), z.number().int()]);

const buildSchema = z.object({
  // z.literal takes a list, so the readable versions stay in one place rather
  // than being spelled out again here.
  v: z.literal(READABLE_VERSIONS),
  size: z.number().int().positive(),
  seed: z.number().int().nonnegative(),
  /** Absent before version 4, where every world was grown with trees. */
  trees: z.boolean().default(true),
  removed: z.array(positionSchema),
  added: z.array(z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()])),
});

export type SavedBuild = z.infer<typeof buildSchema>;

/** Reduce a live world to the differences from its generated terrain. */
export function serializeWorld(
  seed: number,
  blocks: Map<BlockKey, number>,
  size: number = WORLD_SIZE,
  trees: boolean = true,
): string {
  const original = generateTerrain(seed, size, { trees });

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
    size,
    seed,
    trees,
    removed,
    added,
  };

  return JSON.stringify(build);
}

export interface LoadedWorld {
  seed: number;
  blocks: Map<BlockKey, number>;
  /** Carried back out so that saving an edited build regenerates the same terrain. */
  size: number;
  trees: boolean;
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

  // size and trees are the generator's inputs. Rebuilding the terrain without
  // them gives a different landscape to the one the differences were recorded
  // against, so the build would load subtly wrong rather than fail.
  const { seed, size, trees, removed, added } = result.data;
  const blocks = generateTerrain(seed, size, { trees });

  for (const [x, y, z] of removed) blocks.delete(toKey(x, y, z));
  for (const [x, y, z, id] of added) blocks.set(toKey(x, y, z), id);

  return { seed, blocks, size, trees };
}
