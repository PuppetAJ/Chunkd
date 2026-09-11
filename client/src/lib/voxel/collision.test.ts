import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AXIS_Y,
  FACING_NORTH,
  FACING_WEST,
  packBlock,
  packTrapdoor,
  SHAPE_FENCE,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_WALL,
} from "./blockValue.ts";
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

test("a player walks up onto a slab instead of stopping against it", () => {
  // Step assist. Without it every slab floor, terrace and doorstep would need
  // a jump to get onto, which is what makes building with slabs unpleasant.
  // A raised half step covering the far side of the floor, so the player is
  // still standing on something once they are up.
  const blocks = floor();
  for (let x = 2; x <= 5; x += 1) {
    for (let z = -5; z <= 5; z += 1) {
      blocks.set(toKey(x, 1, z), packBlock(1, AXIS_Y, SHAPE_SLAB_BOTTOM));
    }
  }

  const body = standing(0, 0);
  for (let i = 0; i < 15; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.x > 2, `should have walked onto the slab, stopped at ${body.x}`);
  assert.equal(body.y, 1, "should be standing on the slab's surface");
  assert.equal(body.onGround, true);
});

test("a whole block is still a wall, not a step", () => {
  // The step height sits between half a block and a whole one on purpose. If
  // it did not, a wall could be climbed by walking into it.
  const blocks = withWall(floor());
  const body = standing(0, 0);

  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.x < 2, `should have stopped at the wall, got ${body.x}`);
  assert.equal(body.y, 0.5, "should not have climbed it");
});

test("a single full block is not walked up either", () => {
  // One block on the floor is a whole block's rise, which is a jump.
  const blocks = floor();
  for (let z = -5; z <= 5; z += 1) blocks.set(toKey(2, 1, z), 1);

  const body = standing(0, 0);
  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.x < 2, `should have stopped against it, got ${body.x}`);
  assert.equal(body.y, 0.5);
});

test("step assist works along z as well as x", () => {
  const blocks = floor();
  for (let x = -5; x <= 5; x += 1) {
    blocks.set(toKey(x, 1, 2), packBlock(1, AXIS_Y, SHAPE_SLAB_BOTTOM));
  }

  const body = standing(0, 0);
  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0, 0, 0.2);

  assert.ok(body.z > 2, `should have walked onto the slab, stopped at ${body.z}`);
  assert.equal(body.y, 1);
});

test("a step with no headroom is refused rather than lifting the player into it", () => {
  // A slab to step onto with a solid block right above it. Lifting the player
  // regardless would put them inside that block, and the push-out branch would
  // then shove them up through it.
  const blocks = floor();
  for (let z = -5; z <= 5; z += 1) {
    blocks.set(toKey(2, 1, z), packBlock(1, AXIS_Y, SHAPE_SLAB_BOTTOM));
    blocks.set(toKey(2, 2, z), 1);
  }

  const body = standing(0, 0);
  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.x < 2, `should have stopped, got ${body.x}`);
  assert.equal(body.y, 0.5, "should not have been lifted");
});

test("a player in mid-air is not lifted onto a ledge by step assist", () => {
  // Stepping up is only for someone standing on something. Without that gate,
  // drifting into a ledge while airborne would pull the player onto it, and
  // jumping at a wall would climb it half a block per hop.
  const blocks = new Map<BlockKey, number>();
  // A ledge whose top is 3.5, which is half a block above the player's feet
  // and so within step height. Nothing underneath them at all.
  for (let z = -5; z <= 5; z += 1) blocks.set(toKey(2, 3, z), 1);

  // Just short of overlapping the ledge, so the player is genuinely
  // unsupported rather than resting on its edge.
  const body: Body = { x: 1.19, y: 3, z: 0, onGround: false };
  moveBody(blocks, body, 0.2, 0, 0);

  assert.equal(body.y, 3, `should not have been lifted, at ${body.y}`);
  assert.equal(body.onGround, false);
  assert.ok(body.x < 1.5, `should have stopped against the ledge, at ${body.x}`);
});

test("a stair is a step, not a wall", () => {
  // Stairs used to collide as whole cubes, which made walking onto one a full
  // block rise and therefore a jump. The low half is what the player meets
  // first, and that is half a block.
  const blocks = floor();
  for (let z = -5; z <= 5; z += 1) {
    // Facing west means the low step faces the player walking east.
    blocks.set(toKey(2, 1, z), packBlock(1, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_WEST));
  }

  // Far enough to climb the stair, not so far as to walk off the far side of
  // it: the row is one cell deep and there is nothing beyond it.
  const body = standing(0, 0);
  for (let i = 0; i < 12; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.x > 2, `should have walked onto the stair, stopped at ${body.x}`);
  assert.equal(body.y, 1.5, "should be standing on top of the stair");
  assert.equal(body.onGround, true);
});

test("a staircase can be walked all the way up", () => {
  // Four stairs, each one cell further along and one higher, which is what a
  // staircase actually is. Every step has to be walkable or the climb stops.
  const blocks = floor();
  for (let step = 0; step < 4; step += 1) {
    for (let z = -5; z <= 5; z += 1) {
      blocks.set(
        toKey(2 + step, 1 + step, z),
        packBlock(1, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_WEST),
      );
    }
  }

  const body = standing(0, 0);
  for (let i = 0; i < 80; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.y >= 4.5, `should have climbed all four stairs, reached ${body.y}`);
});

test("a fence cannot be walked onto", () => {
  const blocks = floor();
  for (let z = -5; z <= 5; z += 1) blocks.set(toKey(2, 1, z), packBlock(1, AXIS_Y, SHAPE_FENCE));

  const body = standing(0, 0);
  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.x < 2, `should have stopped at the fence, got ${body.x}`);
  assert.equal(body.y, 0.5);
});

test("fences and walls cannot be jumped over, but a whole block can", () => {
  // A jump peaks about 1.35 above the ground. Fences and walls collide a block
  // and a half high, so a player at the top of a jump still meets them, while a
  // whole block, one high, passes under their feet.
  const peak = 0.5 + 1.35;
  const cases: [string, number, boolean][] = [
    ["fence", packBlock(1, AXIS_Y, SHAPE_FENCE), true],
    ["wall", packBlock(4, AXIS_Y, SHAPE_WALL), true],
    ["whole block", packBlock(1), false],
  ];
  for (const [name, value, blocked] of cases) {
    const blocks = floor();
    for (let z = -5; z <= 5; z += 1) blocks.set(toKey(2, 1, z), value);
    const body: Body = { x: 0, y: peak, z: 0, onGround: false };
    for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.2, 0, 0);
    assert.equal(body.x < 2, blocked, `${name}: stopped at ${body.x}`);
  }
});

test("a player can stand on top of a fence", () => {
  // Its collision top is a block above its base, and that is where a player
  // dropping onto it comes to rest.
  const blocks = floor();
  blocks.set(toKey(0, 1, 0), packBlock(1, AXIS_Y, SHAPE_FENCE));

  const body: Body = { x: 0, y: 3, z: 0, onGround: false };
  for (let i = 0; i < 40; i += 1) moveBody(blocks, body, 0, -0.1, 0);

  assert.equal(body.y, 2, "should be resting on the fence");
  assert.equal(body.onGround, true);
});

test("a shut trapdoor on the ground is walked onto like a step", () => {
  const blocks = floor();
  for (let z = -5; z <= 5; z += 1) {
    blocks.set(toKey(2, 1, z), packTrapdoor(1, FACING_NORTH, false, false));
  }

  const body = standing(0, 0);
  for (let i = 0; i < 11; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.x > 2, `should have walked onto the trapdoor, stopped at ${body.x}`);
  assert.equal(body.y, 0.5 + 3 / 16);
});

test("an open trapdoor can be walked straight through", () => {
  const blocks = floor();
  for (let z = -5; z <= 5; z += 1) {
    blocks.set(toKey(2, 1, z), packTrapdoor(1, FACING_NORTH, false, true));
    blocks.set(toKey(2, 2, z), packTrapdoor(1, FACING_NORTH, true, true));
  }

  const body = standing(0, 0);
  for (let i = 0; i < 20; i += 1) moveBody(blocks, body, 0.2, 0, 0);

  assert.ok(body.x > 2.5, `should have walked through, stopped at ${body.x}`);
  assert.equal(body.y, 0.5);
});
