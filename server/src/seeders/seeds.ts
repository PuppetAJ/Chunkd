import { faker } from "@faker-js/faker";
import { Types, type HydratedDocument } from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "../config/db.ts";
import { Thought, User, type UserDocument } from "../models/index.ts";

// Every seeded account shares this password so you can log in as anyone while
// developing. It only ever runs against a local database.
const SEED_PASSWORD = "chunkd-dev-password";

const USER_COUNT = 25;
const THOUGHT_COUNT = 60;
const MAX_REACTIONS_PER_THOUGHT = 4;

function pickRandom<T>(items: T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  // `items` is never empty where this is called, but the compiler cannot know
  // that, so give it a definite answer.
  if (item === undefined) throw new Error("Cannot pick from an empty list");
  return item;
}

async function seed(): Promise<void> {
  await connectToDatabase();

  console.log("Clearing existing data...");
  await Promise.all([User.deleteMany({}), Thought.deleteMany({})]);

  console.log(`Creating ${USER_COUNT} users...`);
  // HydratedDocument<UserDocument> is "a UserDocument that came back from the
  // database", so it has .save() and the other Mongoose instance methods on it.
  const users: HydratedDocument<UserDocument>[] = [];
  for (let i = 0; i < USER_COUNT; i += 1) {
    // The old seeder used User.collection.insertMany, which bypasses Mongoose
    // entirely. That skipped the password-hashing hook, so none of the seeded
    // accounts could actually log in. Going through User.create fixes that.
    // Derive the email from the username, and append the loop index, so that
    // every account is unique and you can guess any seeded login from the feed.
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

  console.log(
    `\nDone. ${USER_COUNT} users and ${THOUGHT_COUNT} posts created.\n` +
      `Log in as any seeded user with the password: ${SEED_PASSWORD}\n` +
      `Example login: ${users[0]?.email ?? "(none)"}\n`,
  );

  await disconnectFromDatabase();
}

seed().catch(async (error: unknown) => {
  console.error("Seeding failed:", error);
  await disconnectFromDatabase();
  process.exit(1);
});
