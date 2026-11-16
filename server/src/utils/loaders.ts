import DataLoader from "dataloader";
import { Build, User, type BuildDocument, type UserDocument } from "../models/index.ts";

function inOrder<T extends { _id: { toString(): string } }>(
  ids: readonly string[],
  rows: T[],
): (T | null)[] {
  const byId = new Map(rows.map((row) => [row._id.toString(), row]));
  return ids.map((id) => byId.get(id) ?? null);
}

export function createLoaders() {
  return {
    userById: new DataLoader<string, UserDocument | null>(async (ids) =>
      inOrder(ids, await User.find({ _id: { $in: ids } }).exec()),
    ),

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
