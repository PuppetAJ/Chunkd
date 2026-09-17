import DataLoader from "dataloader";
import { Build, User, type BuildDocument, type UserDocument } from "../models/index.ts";

/** Rows come back from Mongo in any order; a loader needs them in the order asked, with null for a miss. */
function inOrder<T extends { _id: { toString(): string } }>(
  ids: readonly string[],
  rows: T[],
): (T | null)[] {
  const byId = new Map(rows.map((row) => [row._id.toString(), row]));
  return ids.map((id) => byId.get(id) ?? null);
}

/**
 * Field resolvers run once per row, so a feed page would otherwise look up each
 * post's author and build one at a time. These collect the ids asked for during
 * a single request and fetch each collection once.
 *
 * Call this per request, never once for the process: a loader caches what it has
 * loaded, and a shared one would serve one visitor's stale data to the next.
 */
export function createLoaders() {
  return {
    userById: new DataLoader<string, UserDocument | null>(async (ids) =>
      inOrder(ids, await User.find({ _id: { $in: ids } }).exec()),
    ),

    // Summary fields only. Without the select, every feed page would pull whole
    // worlds out of the database.
    buildSummaryById: new DataLoader<string, BuildDocument | null>(async (ids) =>
      inOrder(
        ids,
        await Build.find({ _id: { $in: ids } })
          .select("_id name thumbnail createdAt updatedAt")
          .exec(),
      ),
    ),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
