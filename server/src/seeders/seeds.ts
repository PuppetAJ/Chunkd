import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { faker } from "@faker-js/faker";
import { Types, type HydratedDocument } from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "../config/db.ts";
import { DEMO_EMAIL, DEMO_USERNAME } from "../config/demo.ts";
import { isProduction } from "../config/env.ts";
import { Build, Thought, User, type UserDocument } from "../models/index.ts";

/** Worlds someone actually built, committed with their thumbnails so seeding needs no browser. */
interface ShowcaseBuild {
  name: string;
  caption: string;
  format: number;
  data: string;
  thumbnail: string;
}

const showcaseBuilds: ShowcaseBuild[] = JSON.parse(
  readFileSync(new URL("./showcaseBuilds.json", import.meta.url), "utf8"),
);

// Shared by every seeded account in development. On the live site the seeded
// authors own the landing page builds, so the password is random and thrown away.
const SEED_PASSWORD = isProduction
  ? randomBytes(24).toString("base64url")
  : "chunkd-dev-password";

// Pass --force to reset even when nothing has changed since the last one.
const FORCE = process.argv.includes("--force");

const USER_COUNT = 25;
const THOUGHT_COUNT = 60;
const MAX_REACTIONS_PER_THOUGHT = 4;

function pickRandom<T>(items: T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) throw new Error("Cannot pick from an empty list");
  return item;
}

/** Has anyone used the site since the last reset? If not, the scheduled reset leaves it alone. */
async function somebodyUsedIt(demo: HydratedDocument<UserDocument>): Promise<boolean> {
  const [others, posts] = await Promise.all([
    User.countDocuments({ isDemo: { $ne: true } }),
    Thought.countDocuments(),
  ]);
  if (others !== USER_COUNT) return true;
  if (posts !== THOUGHT_COUNT + showcaseBuilds.length) return true;

  const [demoPosts, demoBuilds] = await Promise.all([
    Thought.countDocuments({ author: demo._id }),
    Build.countDocuments({ owner: demo._id }),
  ]);
  return demoPosts > 0 || demoBuilds > 0 || demo.following.length > 0;
}

async function seed(): Promise<void> {
  // This deletes everything, so production needs an explicit opt-in.
  if (isProduction && process.env.SEED_ALLOW_PRODUCTION !== "1") {
    console.error(
      "Refusing to reset a production database. Set SEED_ALLOW_PRODUCTION=1 if you mean it.",
    );
    process.exit(1);
  }

  await connectToDatabase();

  // Reserved up front so the name cannot be taken by anyone else.
  const demo =
    (await User.findOne({ username: DEMO_USERNAME })) ??
    (await User.create({
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      password: randomBytes(24).toString("base64url"),
      isDemo: true,
    }));

  if (!FORCE && !(await somebodyUsedIt(demo))) {
    console.log("Nothing has changed since the last reset. Leaving the database as it is.");
    await disconnectFromDatabase();
    return;
  }

  console.log("Clearing existing data...");
  // The demo account survives so a token issued before the reset keeps working.
  await Promise.all([
    User.deleteMany({ isDemo: { $ne: true } }),
    Thought.deleteMany({}),
    Build.deleteMany({}),
  ]);
  // Not demo.save(): that re-validates the whole document, and an invalid demo
  // row would make every scheduled reset fail here, after the wipe.
  await User.updateOne({ _id: demo._id }, { $set: { following: [] } });

  console.log(`Creating ${USER_COUNT} users...`);
  const users: HydratedDocument<UserDocument>[] = [];
  for (let i = 0; i < USER_COUNT; i += 1) {
    // User.create rather than insertMany, so the password hook runs. The index keeps names unique.
    const username = `${faker.internet
      .username()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 18)}${i}`;

    const user = await User.create({
      username,
      email: `${username}@chunkd.test`,
      password: SEED_PASSWORD,
    });
    users.push(user);
  }

  console.log("Linking follows...");
  for (const user of users) {
    const following = new Set<string>();
    const followCount = Math.floor(Math.random() * 5);
    while (following.size < followCount) {
      const candidate = pickRandom(users);
      if (candidate._id.toString() !== user._id.toString()) {
        following.add(candidate._id.toString());
      }
    }
    user.following = [...following].map((id) => new Types.ObjectId(id));
    await user.save();
  }

  console.log(`Creating ${THOUGHT_COUNT} posts...`);
  for (let i = 0; i < THOUGHT_COUNT; i += 1) {
    const author = pickRandom(users);
    const reactionCount = Math.floor(Math.random() * (MAX_REACTIONS_PER_THOUGHT + 1));

    await Thought.create({
      author: author._id,
      thoughtText: faker.lorem.sentence({ min: 4, max: 18 }).slice(0, 280),
      reactions: Array.from({ length: reactionCount }, () => ({
        author: pickRandom(users)._id,
        reactionBody: faker.lorem.sentence({ min: 3, max: 12 }).slice(0, 280),
      })),
    });
  }

  // Spread across accounts so profiles have something in them too.
  console.log(`Creating ${showcaseBuilds.length} builds...`);
  for (let i = 0; i < showcaseBuilds.length; i += 1) {
    const showcase = showcaseBuilds[i];
    if (!showcase) continue;
    const owner = users[i % users.length];
    if (!owner) continue;

    const build = await Build.create({
      owner: owner._id,
      name: showcase.name,
      format: showcase.format,
      data: showcase.data,
      thumbnail: showcase.thumbnail,
      featured: true,
    });

    await Thought.create({
      author: owner._id,
      thoughtText: showcase.caption,
      build: build._id,
      reactions: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({
        author: pickRandom(users)._id,
        reactionBody: faker.lorem.sentence({ min: 3, max: 12 }).slice(0, 280),
      })),
    });
  }


  console.log(
    `\nDone. ${USER_COUNT} users, ${showcaseBuilds.length} builds and ` +
      `${THOUGHT_COUNT + showcaseBuilds.length} posts created.\n` +
      (isProduction
        ? "Seeded accounts have a random password on the live site.\n"
        : `Log in as any seeded user with the password: ${SEED_PASSWORD}\n`) +
      `Example login: ${users[0]?.email ?? "(none)"}\n`,
  );

  await disconnectFromDatabase();
}

seed().catch(async (error: unknown) => {
  console.error("Seeding failed:", error);
  await disconnectFromDatabase();
  process.exit(1);
});
