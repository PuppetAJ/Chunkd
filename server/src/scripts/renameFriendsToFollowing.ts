/**
 * One-off migration: rename the `friends` array on every user to `following`.
 *
 * The field was always a one-way list — adding someone wrote to your document
 * and nobody else's — so this only changes what it is called, not what it
 * holds. Nothing is lost and nothing is recomputed.
 *
 *   pnpm --filter server migrate:following
 *
 * Safe to run more than once: a document that has already been renamed has no
 * `friends` field, so the filter skips it.
 */
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "../config/db.ts";

async function run(): Promise<void> {
  await connectToDatabase();

  const users = mongoose.connection.collection("users");
  const pending = await users.countDocuments({ friends: { $exists: true } });

  if (pending === 0) {
    console.log("Nothing to migrate: no user still has a `friends` field.");
  } else {
    const result = await users.updateMany(
      { friends: { $exists: true } },
      { $rename: { friends: "following" } },
    );
    console.log(`Renamed friends -> following on ${result.modifiedCount} user(s).`);
  }

  await disconnectFromDatabase();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
