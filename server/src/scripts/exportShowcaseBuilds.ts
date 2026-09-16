/**
 * Exports the builds listed below from one account into showcaseBuilds.json,
 * which `pnpm seed` puts on the landing page:
 *
 *   pnpm showcase:export badelin
 *
 * The seeder posts them in list order, so the last one becomes the landing page hero.
 */
import { writeFileSync } from "node:fs";
import { connectToDatabase, disconnectFromDatabase } from "../config/db.ts";
import { Build, User } from "../models/index.ts";

const OUT = new URL("../seeders/showcaseBuilds.json", import.meta.url);

/** Build name to the post that goes with it. A build not listed here is left out. */
const CAPTIONS: [name: string, caption: string][] = [
  ["Cabin", "A small spruce cabin with a path down the hill. First thing I built that I did not tear down again."],
  ["Dinosaur", "A dinosaur, all spruce. Started as a joke and then I could not leave the tail unfinished."],
  ["Medieval House", "Timber framed house, three floors and more balconies than it needs. The roof took most of an evening."],
  ["Castle", "A castle with red roofed towers. Put it on the hill so the spires clear the treeline."],
  ["Desert Temple", "A temple with green domes, up on the hill. Symmetry was the whole game here."],
  ["Big Tree", "One enormous tree. The trunk twists on the way up and the canopy hangs out over the slope."],
  ["Modern House", "A house on a stone base with a split roof and tall windows. Spent most of the time on the roof line."],
];

async function run(): Promise<void> {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: pnpm showcase:export <username>");
    process.exit(1);
  }

  await connectToDatabase();

  const owner = await User.findOne({ username: new RegExp(`^${username}$`, "i") });
  if (!owner) {
    console.error(`No user called ${username}.`);
    await disconnectFromDatabase();
    process.exit(1);
  }

  const builds = await Build.find({ owner: owner._id });
  const exported = [];
  for (const [name, caption] of CAPTIONS) {
    const build = builds.find((one) => one.name === name);
    if (!build) {
      console.error(`${owner.username} has no build called "${name}"; skipping it.`);
      continue;
    }
    exported.push({ name, caption, format: build.format, data: build.data, thumbnail: build.thumbnail ?? "" });
    console.log(`${name.padEnd(16)} ${(build.data.length / 1024).toFixed(0).padStart(4)} kB`);
  }

  writeFileSync(OUT, JSON.stringify(exported, null, 2) + "\n");
  console.log(`\nWrote ${exported.length} builds to ${OUT.pathname}`);

  await disconnectFromDatabase();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
