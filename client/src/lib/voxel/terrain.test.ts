import assert from "node:assert/strict";
import test from "node:test";

import { collides, moveBody } from "./collision.ts";
import { toKey } from "./coords.ts";
import { generateTerrain, spawnPointFor } from "./terrain.ts";

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
