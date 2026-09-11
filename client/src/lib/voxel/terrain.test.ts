import assert from "node:assert/strict";
import test from "node:test";

import { collides, moveBody } from "./collision.ts";
import { toKey } from "./coords.ts";
import { generateTerrain, spawnPointFor, WORLD_SIZE } from "./terrain.ts";
import { BLOCK_IDS } from "./blockIds.ts";
import { blockIdOf } from "./blockValue.ts";

/** Enough seeds to catch a fault that only some worlds trigger. */
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

test("the player never spawns inside a block", () => {
  // Trees made this fail on about one seed in five. Spawning inside a block
  // meant collision was skipped, so the player fell through the world, and the
  // respawn put them back in the same place.
  for (const seed of SEEDS) {
    const blocks = generateTerrain(seed);
    const [x, y, z] = spawnPointFor(blocks);
    assert.equal(collides(blocks, x, y, z), false, `seed ${seed} spawns inside a block`);
  }
});

test("a player standing at the spawn point stays there", () => {
  for (const seed of SEEDS) {
    const blocks = generateTerrain(seed);
    const [x, y, z] = spawnPointFor(blocks);
    const body = { x, y, z, onGround: false };
    for (let step = 0; step < 120; step += 1) moveBody(blocks, body, 0, -0.05, 0);
    assert.ok(body.y > y - 1, `seed ${seed} sank from ${y} to ${body.y}`);
    assert.equal(body.onGround, true, `seed ${seed} never landed`);
  }
});

test("a player buried in blocks rises out instead of sinking through the world", () => {
  const blocks = generateTerrain(8);
  const [x, y, z] = spawnPointFor(blocks);
  // Bury them where they stand.
  for (let dy = 0; dy <= 2; dy += 1) {
    blocks.set(toKey(Math.round(x - 0.5), Math.round(y + 0.5) + dy, Math.round(z - 0.5)), 18);
  }

  const body = { x, y: y + 0.2, z, onGround: false };
  const start = body.y;
  for (let step = 0; step < 60; step += 1) moveBody(blocks, body, 0, -0.05, 0);

  assert.ok(body.y > start, `expected to rise out, went from ${start} to ${body.y}`);
  assert.equal(collides(blocks, body.x, body.y, body.z), false, "should end up clear of the blocks");
});

test("every generated world has ground at its middle", () => {
  for (const seed of SEEDS.slice(0, 10)) {
    const blocks = generateTerrain(seed);
    const [, y] = spawnPointFor(blocks);
    assert.ok(y > 0 && y < 60, `seed ${seed} spawned at an implausible height ${y}`);
  }
});

const LEAVES = new Set<number>([
  BLOCK_IDS.oakLeaves,
  BLOCK_IDS.birchLeaves,
  BLOCK_IDS.cherryLeaves,
]);

const LOGS = new Set<number>([BLOCK_IDS.oakLog, BLOCK_IDS.birchLog, BLOCK_IDS.cherryLog]);

test("a canopy finishes in a cross rather than a flat square", () => {
  // Minecraft's oak clips the four corners off the top layer of leaves. Find
  // the top of a trunk and check the layer above it has edges but no corners.
  const blocks = generateTerrain(1337);

  let checked = 0;
  for (const [key, value] of blocks) {
    if (!LOGS.has(blockIdOf(value))) continue;
    const [x, y, z] = key.split(",").map(Number) as [number, number, number];
    // The top of a trunk is a log with no log above it.
    if (LOGS.has(blockIdOf(blocks.get(toKey(x, y + 1, z)) ?? 0))) continue;

    const top = y + 1;
    // The ring one above the trunk top: edges present, corners absent.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      assert.ok(
        LEAVES.has(blockIdOf(blocks.get(toKey(x + dx, top, z + dz)) ?? 0)),
        `the canopy should have a leaf beside its tip at ${x + dx},${top},${z + dz}`,
      );
    }
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      assert.ok(
        !LEAVES.has(blockIdOf(blocks.get(toKey(x + dx, top, z + dz)) ?? 0)),
        `the canopy should have no corner leaf at ${x + dx},${top},${z + dz}`,
      );
    }
    checked += 1;
  }

  assert.ok(checked > 5, `expected several trees to check, found ${checked}`);
});

test("a world can be generated at each offered size", () => {
  for (const size of [WORLD_SIZE, WORLD_SIZE * 2]) {
    const blocks = generateTerrain(99, size);
    const [x, , z] = spawnPointFor(blocks, size);
    assert.ok(x > 0 && x < size, `spawn x ${x} should be inside a ${size} world`);
    assert.ok(z > 0 && z < size, `spawn z ${z} should be inside a ${size} world`);
  }
});
