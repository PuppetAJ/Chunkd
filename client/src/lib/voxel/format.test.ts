import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { BLOCK_IDS } from "./blockIds.ts";
import {
  AXIS_Y,
  blockIdOf,
  FACING_EAST,
  packBlock,
  packTrapdoor,
  SHAPE_FENCE,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_WALL,
} from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { BUILD_FORMAT_VERSION, deserializeWorld, serializeWorld } from "./format.ts";
import { generateTerrain, WORLD_SIZE } from "./terrain.ts";

const LEAF_BLOCK_IDS = new Set<number>([
  BLOCK_IDS.oakLeaves,
  BLOCK_IDS.birchLeaves,
  BLOCK_IDS.cherryLeaves,
]);

const TREE_BLOCK_IDS = new Set<number>([
  ...LEAF_BLOCK_IDS,
  BLOCK_IDS.oakLog,
  BLOCK_IDS.birchLog,
  BLOCK_IDS.cherryLog,
]);

/**
 * A saved build stores its seed and the blocks the player changed, not the
 * world. Loading one regenerates the terrain and reapplies those changes, so
 * the generator is part of the save format: if it ever produces different
 * output, every build saved before the change quietly loads as a different
 * world. No error, just the wrong build.
 *
 * These hashes pin the generator down. A failure here is not necessarily a bug,
 * it is a warning that saved builds have changed meaning. Either undo the
 * change to the terrain, or raise BUILD_FORMAT_VERSION and keep the old
 * generator around for old builds, then record the new hashes here.
 *
 * They changed once, at version 4, when tree canopies lost the four corners of
 * their top ring. No old generator was kept, and that was a decision rather
 * than an oversight: the change only ever removes blocks, so an older build
 * rebuilds exactly as it was apart from those leaves, which is the shape it is
 * meant to have now. Keeping a second generator would have frozen square tree
 * tops into old builds forever and left two generators to maintain. The test
 * below named "a build saved before the canopy changed loses only leaves"
 * holds that reasoning in place.
 */
const TERRAIN_HASHES: Record<number, string> = {
  1: "4cc5becfc119f0b5",
  42: "d8040069f2cb3a59",
  1337: "1fdefe332858a6ba",
  99999: "d6a2dbc4ed8953b7",
};

/** A short, stable fingerprint of a world. Keys are sorted so it does not
 * depend on the order the generator happened to insert them in. */
function fingerprint(blocks: Map<BlockKey, number>): string {
  const hash = createHash("sha256");
  for (const key of [...blocks.keys()].sort()) hash.update(`${key}=${blocks.get(key)};`);
  return hash.digest("hex").slice(0, 16);
}

test("the world size has not changed", () => {
  // The size is baked into every saved build's coordinates as much as the seed
  // is, so it belongs under the same guard.
  assert.equal(WORLD_SIZE, 64);
});

test("terrain generation is unchanged for known seeds", () => {
  for (const [seed, expected] of Object.entries(TERRAIN_HASHES)) {
    const blocks = generateTerrain(Number(seed));
    assert.equal(
      fingerprint(blocks),
      expected,
      `seed ${seed} no longer generates the same world, so builds saved on it will load wrong`,
    );
  }
});

test("a world grown without trees has no vegetation and no trunks", () => {
  const bare = generateTerrain(42, WORLD_SIZE, { trees: false });
  const treed = generateTerrain(42);

  const vegetation = [...bare.values()].filter((value) => TREE_BLOCK_IDS.has(blockIdOf(value)));
  assert.equal(vegetation.length, 0, "no tree blocks should have been planted");
  assert.ok(bare.size < treed.size, "a bare world should hold fewer blocks than a treed one");
});

test("turning trees off leaves the ground exactly as it was", () => {
  // Trees draw from their own random stream, so skipping them must not shift
  // the landscape underneath. Every block of the bare world should appear
  // unchanged in the treed one.
  const bare = generateTerrain(1337, WORLD_SIZE, { trees: false });
  const treed = generateTerrain(1337);

  for (const [key, value] of bare) {
    assert.equal(treed.get(key), value, `block at ${key} differs between a bare and a treed world`);
  }
});

test("a bare world round-trips as bare", () => {
  const blocks = generateTerrain(42, WORLD_SIZE, { trees: false });
  const loaded = deserializeWorld(serializeWorld(42, blocks, WORLD_SIZE, false));

  assert.ok(loaded, "should have loaded");
  assert.equal(loaded.trees, false);
  assert.equal(fingerprint(loaded.blocks), fingerprint(blocks));
});

test("a larger world round-trips at its own size", () => {
  // The size is an input to the generator, so a build saved at one size and
  // reloaded at the default would rebuild against a different landscape. This
  // is the case that used to load wrong, silently.
  const size = WORLD_SIZE * 2;
  const blocks = generateTerrain(7, size);
  const loaded = deserializeWorld(serializeWorld(7, blocks, size));

  assert.ok(loaded, "should have loaded");
  assert.equal(loaded.size, size);
  assert.equal(fingerprint(loaded.blocks), fingerprint(blocks));
});

test("a build saved before the canopy changed loses only leaves", () => {
  // Version 4 clipped the corners off the top of every canopy. Older builds are
  // still read with the current generator rather than a preserved old one, so
  // what they lose has to be exactly those leaves and nothing else.
  const seed = 1337;
  const blocks = generateTerrain(seed);
  const stone = toKey(10, 40, 10);
  const edited = new Map(blocks);
  edited.set(stone, BLOCK_IDS.stone);

  const v3 = JSON.parse(serializeWorld(seed, edited));
  v3.v = 3;
  delete v3.trees;

  const loaded = deserializeWorld(JSON.stringify(v3));
  assert.ok(loaded, "a version 3 payload should still load");
  assert.equal(loaded.trees, true, "a payload with no trees field means the world had them");
  assert.equal(loaded.blocks.get(stone), BLOCK_IDS.stone, "placed blocks should survive");

  // Anything the older world had that this one does not must be a leaf.
  for (const [key, value] of edited) {
    if (loaded.blocks.has(key)) continue;
    assert.ok(
      LEAF_BLOCK_IDS.has(blockIdOf(value)),
      `loading dropped a block that is not a leaf at ${key}`,
    );
  }
});

test("an untouched world round-trips", () => {
  const blocks = generateTerrain(42);
  const loaded = deserializeWorld(serializeWorld(42, blocks));

  assert.ok(loaded, "should have loaded");
  assert.equal(loaded.seed, 42);
  assert.equal(fingerprint(loaded.blocks), fingerprint(blocks));
});

test("an edited world round-trips exactly", () => {
  const seed = 1337;
  const blocks = generateTerrain(seed);
  const edited = new Map(blocks);

  // Take some terrain away and put some blocks somewhere the generator would
  // never place any, which exercises both halves of the diff.
  let removed = 0;
  for (const key of blocks.keys()) {
    if (removed >= 250) break;
    edited.delete(key);
    removed += 1;
  }
  for (let i = 0; i < 400; i += 1) {
    edited.set(toKey(i % 30, 45 + Math.floor(i / 30), (i * 7) % 23), 3);
  }

  const loaded = deserializeWorld(serializeWorld(seed, edited));

  assert.ok(loaded, "should have loaded");
  assert.equal(loaded.blocks.size, edited.size);
  assert.equal(fingerprint(loaded.blocks), fingerprint(edited));
});

test("a saved build is small", () => {
  // The whole point of the format. Version 1 wrote every block out and ran to
  // hundreds of kilobytes; the server now refuses anything over 512 KB.
  const blocks = generateTerrain(7);
  const edited = new Map(blocks);
  for (let i = 0; i < 1000; i += 1) edited.set(toKey(i % 40, 45 + Math.floor(i / 40), i % 31), 3);

  assert.ok(
    serializeWorld(7, edited).length < 64 * 1024,
    "a thousand placed blocks should still serialize to well under 64 KB",
  );
});

test("builds from an unreadable format are refused rather than misread", () => {
  const ancient = JSON.stringify({ v: 1, size: 64, seed: 1, removed: [], added: [] });
  const future = JSON.stringify({
    v: BUILD_FORMAT_VERSION + 1,
    size: 64,
    seed: 1,
    removed: [],
    added: [],
  });

  // Returning null is what shows the "saved in an older format" message.
  // Guessing at the payload instead would load a world that is not the one
  // that was saved.
  assert.equal(deserializeWorld(ancient), null);
  assert.equal(deserializeWorld(future), null);
});

test("builds saved before slabs existed still load", () => {
  // Version 2 is exactly readable: it has no shape bits, and no shape bits
  // means a full cube, which is what every block in a version 2 build is.
  // Refusing them would have thrown away every build already saved.
  const seed = 42;
  const version2 = JSON.stringify({
    v: 2,
    size: WORLD_SIZE,
    seed,
    removed: [[3, 40, 3]],
    added: [[5, 41, 5, 3]],
  });

  const loaded = deserializeWorld(version2);
  assert.ok(loaded, "a version 2 build should still load");
  assert.equal(loaded.seed, seed);
  assert.equal(loaded.blocks.get(toKey(5, 41, 5)), 3);
  assert.equal(loaded.blocks.has(toKey(3, 40, 3)), false);
});

test("slabs survive a save and a load", () => {
  const seed = 1337;
  const blocks = generateTerrain(seed);
  const edited = new Map(blocks);

  const bottom = packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM);
  const top = packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_TOP);
  edited.set(toKey(4, 45, 4), bottom);
  edited.set(toKey(5, 45, 4), top);

  const loaded = deserializeWorld(serializeWorld(seed, edited));
  assert.ok(loaded, "should have loaded");
  assert.equal(loaded.blocks.get(toKey(4, 45, 4)), bottom);
  assert.equal(loaded.blocks.get(toKey(5, 45, 4)), top);
  // The id has to come back out of the packed value unharmed, or a saved slab
  // would load as some other block entirely.
  assert.equal(blockIdOf(loaded.blocks.get(toKey(5, 45, 4)) ?? 0), BLOCK_IDS.stone);
});

test("unreadable payloads are refused rather than thrown", () => {
  for (const payload of ["", "not json", "{}", '{"v":2}', "null", "[]"]) {
    assert.equal(deserializeWorld(payload), null, `should have refused ${JSON.stringify(payload)}`);
  }
});

test("fences, walls and trapdoors survive a round trip, open and shut", () => {
  const seed = 42;
  const edited = new Map(generateTerrain(seed));
  const placed: [BlockKey, number][] = [
    [toKey(10, 60, 10), packBlock(BLOCK_IDS.oakPlanks, AXIS_Y, SHAPE_FENCE)],
    [toKey(11, 60, 10), packBlock(BLOCK_IDS.cobblestone, AXIS_Y, SHAPE_WALL)],
    [toKey(12, 60, 10), packTrapdoor(BLOCK_IDS.sprucePlanks, FACING_EAST, true, true)],
    [toKey(13, 60, 10), packTrapdoor(BLOCK_IDS.cherryPlanks, FACING_EAST, false, false)],
  ];
  for (const [key, value] of placed) edited.set(key, value);

  const payload = serializeWorld(seed, edited);
  assert.equal(JSON.parse(payload).v, BUILD_FORMAT_VERSION);

  const loaded = deserializeWorld(payload);
  assert.ok(loaded, "should have loaded");
  for (const [key, value] of placed) assert.equal(loaded.blocks.get(key), value, `value at ${key}`);
});

test("a version 4 payload still loads", () => {
  const seed = 1337;
  const payload = JSON.parse(serializeWorld(seed, generateTerrain(seed)));
  payload.v = 4;
  assert.ok(deserializeWorld(JSON.stringify(payload)), "a version 4 build should still load");
});
