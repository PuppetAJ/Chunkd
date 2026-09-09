import { test } from "node:test";
import assert from "node:assert/strict";
import { AXIS_Y, packBlock, SHAPE_SLAB_BOTTOM, SHAPE_SLAB_TOP } from "./blockValue.ts";
import { moveBody, type Body } from "./collision.ts";
import { toKey, type BlockKey } from "./coords.ts";

/** A flat floor at y = 0 covering x and z from -5 to 5. */
function floor(): Map<BlockKey, number> {
  const blocks = new Map<BlockKey, number>();
  for (let x = -5; x <= 5; x += 1) {
    for (let z = -5; z <= 5; z += 1) blocks.set(toKey(x, 0, z), 1);
  }
  return blocks;
}

/** Add a wall of blocks at x = 2, two blocks tall, running along z. */
function withWall(blocks: Map<BlockKey, number>): Map<BlockKey, number> {
  for (let z = -5; z <= 5; z += 1) {
    blocks.set(toKey(2, 1, z), 1);
    blocks.set(toKey(2, 2, z), 1);
  }
  return blocks;
}

function standing(x: number, z: number): Body {
  // Feet on the floor's top surface, which is y = 0.5.
  return { x, y: 0.5, z, onGround: true };
}

test("falling lands on the surface of the block underfoot", () => {
  const body: Body = { x: 0, y: 4, z: 0, onGround: false };
  moveBody(floor(), body, 0, -0.3, 0);
  moveBody(floor(), body, 0, -0.3, 0);
  for (let i = 0; i < 20; i += 1) moveBody(floor(), body, 0, -0.3, 0);
  assert.equal(body.y, 0.5);
  assert.equal(body.onGround, true);
});

test("a very fast fall cannot pass through the floor", () => {
  const body: Body = { x: 0, y: 6, z: 0, onGround: false };
  // Far more than one block in a single call.
  moveBody(floor(), body, 0, -9, 0);
  assert.equal(body.y, 0.5);
  assert.equal(body.onGround, true);
});

test("walking into a wall stops on x but keeps sliding on z", () => {
  const blocks = withWall(floor());
  const body = standing(0, 0);
  // Twenty steps keeps the walk within the wall's length; the earlier version
  // of this test walked clean past its end, which is sliding working correctly.
  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.2, 0, 0.2);
  // Wall face is at x = 1.5; the player's half width is 0.3.
  assert.ok(body.x < 1.5 - 0.3 + 1e-9, `x ${body.x} should be short of the wall`);
  assert.ok(body.x > 1.1, `x ${body.x} should have reached the wall`);
  assert.ok(body.z > 3.5, `z ${body.z} should have kept moving along the wall`);
});

test("after touching a wall the player is not stuck", () => {
  const blocks = withWall(floor());
  const body = standing(0, 0);
  // Push into the wall until stopped.
  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.3, 0, 0);
  const atWall = body.x;
  // Now move purely along the wall and purely away from it.
  moveBody(blocks, body, 0, 0, 0.5);
  assert.equal(body.z, 0.5, "should slide along the wall freely");
  moveBody(blocks, body, -0.5, 0, 0);
  assert.ok(body.x < atWall - 0.4, "should walk away from the wall freely");
});

test("standing still on the ground is still on the ground", () => {
  const body = standing(0, 0);
  moveBody(floor(), body, 0, 0, 0);
  assert.equal(body.onGround, true);
});

test("jumping into a ceiling stops below it without tunnelling", () => {
  const blocks = floor();
  // A ceiling three blocks up, centred on y = 3, so its underside is at 2.5.
  for (let x = -5; x <= 5; x += 1) for (let z = -5; z <= 5; z += 1) blocks.set(toKey(x, 3, z), 1);
  const body = standing(0, 0);
  for (let i = 0; i < 10; i += 1) moveBody(blocks, body, 0, 0.3, 0);
  // Head is feet + 1.8, so feet must stay at or below 2.5 - 1.8.
  assert.ok(body.y + 1.8 <= 2.5, `head ${body.y + 1.8} should be under the ceiling`);
  assert.ok(body.y > 0.5, "should have risen off the floor");
});

test("a player stands on the surface of a slab, not on top of its cell", () => {
  // The whole reason collision had to learn about shapes. A bottom slab's
  // surface is halfway up its cell, and landing on the cell's top instead left
  // the player standing a quarter of a block in the air above every slab floor.
  const blocks = floor();
  blocks.set(toKey(0, 1, 0), packBlock(1, AXIS_Y, SHAPE_SLAB_BOTTOM));

  const body: Body = { x: 0, y: 4, z: 0, onGround: false };
  for (let i = 0; i < 30; i += 1) moveBody(blocks, body, 0, -0.3, 0);

  // The slab occupies 0.5 to 1.0, so its surface is at y = 1.
  assert.equal(body.y, 1);
  assert.equal(body.onGround, true);
});

test("standing on a slab is standing inside its cell, and that is allowed", () => {
  // Feet at y = 1 are inside cell 1, which the old test would have called
  // being stuck inside a block. That branch shoves the player upwards, so
  // without this every slab floor would have launched whoever stood on it.
  const blocks = floor();
  blocks.set(toKey(0, 1, 0), packBlock(1, AXIS_Y, SHAPE_SLAB_BOTTOM));

  const body: Body = { x: 0, y: 1, z: 0, onGround: true };
  for (let i = 0; i < 10; i += 1) moveBody(blocks, body, 0, -0.02, 0);

  assert.equal(body.y, 1, "should have stayed on the slab");
  assert.equal(body.onGround, true);
});

test("a top slab is a ceiling to stop your head on", () => {
  const blocks = floor();
  // Its underside is at y = 3, which is 2.5 above the floor the player stands
  // on, so a player 1.8 tall fits underneath it and cannot rise past it.
  blocks.set(toKey(0, 3, 0), packBlock(1, AXIS_Y, SHAPE_SLAB_TOP));

  const body: Body = { x: 0, y: 0.5, z: 0, onGround: true };
  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0, 0.3, 0);

  assert.ok(body.y + 1.8 <= 3, `head at ${body.y + 1.8} should be at or below the slab at 3`);
  assert.ok(body.y > 1, `should have risen from the floor, got ${body.y}`);
});

test("a world of full cubes behaves exactly as it did before shapes existed", () => {
  // Slabs were added by making the height come from the block rather than from
  // the cell. For a full cube those are the same thing, and this is the check
  // that says so: ordinary walls, floors and ceilings are untouched.
  const blocks = withWall(floor());
  const body = standing(0, 0);

  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.2, 0, 0);
  assert.ok(body.x < 2, `should have stopped at the wall, got ${body.x}`);
  assert.equal(body.y, 0.5);
  assert.equal(body.onGround, true);
});
