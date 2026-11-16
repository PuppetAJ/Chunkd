import { z } from "zod";
import { generateTerrain, WORLD_SIZE, WORLD_SIZES } from "./terrain.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

export const BUILD_FORMAT_VERSION = 5;

const READABLE_VERSIONS = [2, 3, 4, 5] as const;

const positionSchema = z.tuple([z.number().int(), z.number().int(), z.number().int()]);

const buildSchema = z.object({
  v: z.literal(READABLE_VERSIONS),
  size: z.number().refine((size) => WORLD_SIZES.some((offered) => offered === size)),
  seed: z.number().int().nonnegative(),
  trees: z.boolean().default(true),
  removed: z.array(positionSchema),
  added: z.array(z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()])),
});

export type SavedBuild = z.infer<typeof buildSchema>;

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
  size: number;
  trees: boolean;
}

export function deserializeWorld(payload: string): LoadedWorld | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  const result = buildSchema.safeParse(parsed);
  if (!result.success) return null;

  const { seed, size, trees, removed, added } = result.data;
  const blocks = generateTerrain(seed, size, { trees });

  for (const [x, y, z] of removed) blocks.delete(toKey(x, y, z));
  for (const [x, y, z, id] of added) blocks.set(toKey(x, y, z), id);

  return { seed, blocks, size, trees };
}
