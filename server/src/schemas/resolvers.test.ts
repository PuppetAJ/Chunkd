import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import { Build } from "../models/index.ts";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  PASSWORD,
  run,
  signUp,
  type Identity,
} from "../test/graphql.ts";

before(connectTestDatabase);
after(disconnectTestDatabase);

const WORLD = JSON.stringify({ v: 5, size: 64, seed: 1, trees: true, removed: [], added: [] });

async function post(user: Identity, text = "Hello", buildId?: string): Promise<string> {
  const result = await run(
    `mutation ($text: String!, $buildId: ID) {
      addThought(thoughtText: $text, buildId: $buildId) { _id }
    }`,
    { text, buildId },
    user,
  );
  assert.deepEqual(result.errors, []);
  return result.data?.["addThought"]._id;
}

async function save(user: Identity, name = "A world"): Promise<string> {
  const result = await run(
    `mutation ($name: String!, $data: String!) { saveBuild(name: $name, data: $data) { _id } }`,
    { name, data: WORLD },
    user,
  );
  assert.deepEqual(result.errors, []);
  return result.data?.["saveBuild"]._id;
}

test("asking who you are needs a session", async () => {
  const result = await run(`{ me { _id } }`);
  assert.equal(result.errors[0]?.code, "UNAUTHENTICATED");
});

test("signing up gives an identity that signs in and answers to me", async () => {
  const user = await signUp();
  const me = await run(`{ me { username email } }`, {}, user);
  assert.equal(me.data?.["me"].username, user.username);
  assert.equal(me.data?.["me"].email, user.email);

  const login = await run(
    `mutation ($email: String!, $password: String!) { login(email: $email, password: $password) { token } }`,
    { email: user.email, password: PASSWORD },
  );
  assert.deepEqual(login.errors, []);
  assert.ok(login.data?.["login"].token);
});

test("a wrong password and an unknown email fail with the same message", async () => {
  const user = await signUp();
  const query = `mutation ($email: String!, $password: String!) { login(email: $email, password: $password) { token } }`;
  const wrong = await run(query, { email: user.email, password: "not-it-at-all" });
  const unknown = await run(query, { email: "nobody@chunkd.test", password: PASSWORD });
  assert.equal(wrong.errors[0]?.message, unknown.errors[0]?.message);
  assert.equal(wrong.data, null);
});

test("the demo username cannot be registered", async () => {
  const result = await run(
    `mutation { addUser(username: "Demo", email: "demo2@chunkd.test", password: "supersecret1") { token } }`,
  );
  assert.match(result.errors[0]?.message ?? "", /reserved/);
});

test("an email address is shown only to its owner", async () => {
  const owner = await signUp();
  const other = await signUp();
  const query = `query ($username: String!) { user(username: $username) { email } }`;
  const asOther = await run(query, { username: owner.username }, other);
  const asOwner = await run(query, { username: owner.username }, owner);
  assert.equal(asOther.data?.["user"].email, null);
  assert.equal(asOwner.data?.["user"].email, owner.email);
});

test("a post can only attach a build you own", async () => {
  const owner = await signUp();
  const other = await signUp();
  const buildId = await save(owner);
  const result = await run(
    `mutation ($buildId: ID) { addThought(thoughtText: "Mine?", buildId: $buildId) { _id } }`,
    { buildId },
    other,
  );
  assert.equal(result.errors[0]?.code, "FORBIDDEN");
});

test("only the author edits or deletes a post", async () => {
  const author = await signUp();
  const other = await signUp();
  const thoughtId = await post(author);

  const edit = await run(
    `mutation ($id: ID!) { updateThought(thoughtId: $id, thoughtText: "Changed") { thoughtText } }`,
    { id: thoughtId },
    other,
  );
  assert.equal(edit.errors[0]?.code, "FORBIDDEN");

  const remove = await run(`mutation ($id: ID!) { deleteThought(thoughtId: $id) }`, { id: thoughtId }, other);
  assert.equal(remove.errors[0]?.code, "FORBIDDEN");

  const own = await run(`mutation ($id: ID!) { deleteThought(thoughtId: $id) }`, { id: thoughtId }, author);
  assert.deepEqual(own.errors, []);
  const gone = await run(`query ($id: ID!) { thought(_id: $id) { _id } }`, { id: thoughtId });
  assert.equal(gone.data?.["thought"], null);
});

test("a comment can be removed by its author or the post's owner, and nobody else", async () => {
  const owner = await signUp();
  const commenter = await signUp();
  const bystander = await signUp();
  const thoughtId = await post(owner);

  const comment = async () => {
    const result = await run(
      `mutation ($id: ID!) { addReaction(thoughtId: $id, reactionBody: "Nice") { reactions { _id } } }`,
      { id: thoughtId },
      commenter,
    );
    const reactions = result.data?.["addReaction"].reactions as { _id: string }[];
    return reactions[reactions.length - 1]!._id;
  };
  const remove = (reactionId: string, as: Identity) =>
    run(
      `mutation ($id: ID!, $reactionId: ID!) {
        deleteReaction(thoughtId: $id, reactionId: $reactionId) { reactionCount }
      }`,
      { id: thoughtId, reactionId },
      as,
    );

  const first = await comment();
  assert.equal((await remove(first, bystander)).errors[0]?.code, "FORBIDDEN");
  assert.deepEqual((await remove(first, commenter)).errors, []);

  const second = await comment();
  const byOwner = await remove(second, owner);
  assert.deepEqual(byOwner.errors, []);
  assert.equal(byOwner.data?.["deleteReaction"].reactionCount, 0);
});

test("following is one way, cannot point at yourself, and counts once", async () => {
  const follower = await signUp();
  const followed = await signUp();
  const follow = (id: string, as: Identity) =>
    run(`mutation ($id: ID!) { follow(userId: $id) { followingCount } }`, { id }, as);

  assert.match((await follow(follower._id, follower)).errors[0]?.message ?? "", /yourself/);

  await follow(followed._id, follower);
  const twice = await follow(followed._id, follower);
  assert.equal(twice.data?.["follow"].followingCount, 1);

  const counts = await run(
    `query ($username: String!) { user(username: $username) { followerCount followingCount } }`,
    { username: followed.username },
  );
  assert.equal(counts.data?.["user"].followerCount, 1);
  assert.equal(counts.data?.["user"].followingCount, 0);

  const unfollow = await run(
    `mutation ($id: ID!) { unfollow(userId: $id) { followingCount } }`,
    { id: followed._id },
    follower,
  );
  assert.equal(unfollow.data?.["unfollow"].followingCount, 0);
});

test("a build's preview has to be an image", async () => {
  const user = await signUp();
  const result = await run(
    `mutation ($data: String!, $thumbnail: String) { saveBuild(data: $data, thumbnail: $thumbnail) { _id } }`,
    { data: WORLD, thumbnail: "data:text/html;base64,PHNjcmlwdD4=" },
    user,
  );
  assert.equal(result.errors[0]?.code, "BAD_USER_INPUT");
});

test("a build is only overwritten or deleted by its owner", async () => {
  const owner = await signUp();
  const other = await signUp();
  const buildId = await save(owner);

  const overwrite = await run(
    `mutation ($id: ID!, $data: String!) { updateBuild(buildId: $id, data: $data) { _id } }`,
    { id: buildId, data: WORLD },
    other,
  );
  assert.equal(overwrite.errors[0]?.code, "FORBIDDEN");

  const remove = await run(`mutation ($id: ID!) { deleteBuild(buildId: $id) }`, { id: buildId }, other);
  assert.equal(remove.errors[0]?.code, "FORBIDDEN");
});

test("deleting a build leaves its posts standing without the attachment", async () => {
  const owner = await signUp();
  const buildId = await save(owner);
  const thoughtId = await post(owner, "Look at this", buildId);

  const remove = await run(`mutation ($id: ID!) { deleteBuild(buildId: $id) }`, { id: buildId }, owner);
  assert.deepEqual(remove.errors, []);

  const thought = await run(`query ($id: ID!) { thought(_id: $id) { thoughtText build { _id } } }`, {
    id: thoughtId,
  });
  assert.equal(thought.data?.["thought"].thoughtText, "Look at this");
  assert.equal(thought.data?.["thought"].build, null);
});

test("the showcase is the featured builds, whatever was posted after them", async () => {
  const curator = await signUp();
  const featuredId = await save(curator, "Featured");
  await Build.updateOne({ _id: featuredId }, { featured: true });
  await post(curator, "The featured one", featuredId);

  const latecomer = await signUp();
  const newerId = await save(latecomer, "Newer");
  await post(latecomer, "Posted later", newerId);

  const result = await run(`{ showcase { build { name } } }`);
  const rows = (result.data?.["showcase"] ?? []) as { build: { name: string } }[];
  assert.deepEqual(rows.map((one) => one.build.name), ["Featured"]);
});

test("a page of the feed costs a handful of queries, not one per row", async () => {
  const author = await signUp();
  for (let i = 0; i < 5; i += 1) await post(author, `Post ${i}`, await save(author));

  // Mongoose reports every query it sends, which is the only honest way to
  // check that the loaders batched rather than assuming it.
  let queries = 0;
  mongoose.set("debug", () => {
    queries += 1;
  });
  const result = await run(
    `{ thoughts(limit: 5) { username author { _id } build { name } } }`,
  );
  mongoose.set("debug", false);

  assert.deepEqual(result.errors, []);
  assert.ok(queries <= 3, `${queries} queries for five posts`);
});
