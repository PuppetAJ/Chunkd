import { test } from "node:test";
import assert from "node:assert/strict";
import { createMotionState, stepPlayer, type MoveInput } from "./playerMotion.ts";
import type { Body } from "./collision.ts";
import { toKey, type BlockKey } from "./coords.ts";

const STILL: MoveInput = {
  forward: 0,
  strafe: 0,
  jump: false,
  sneak: false,
  headingX: 0,
  headingZ: -1,
};

/** Flat ground at y = 0, so its top surface is y = 0.5. */
function ground(): Map<BlockKey, number> {
  const blocks = new Map<BlockKey, number>();
  for (let x = -8; x <= 8; x += 1) {
    for (let z = -8; z <= 8; z += 1) blocks.set(toKey(x, 0, z), 1);
  }
  return blocks;
}

/** Ground plus a single-block step at z >= 3, its top surface at y = 1.5. */
function withStep(): Map<BlockKey, number> {
  const blocks = ground();
  for (let x = -8; x <= 8; x += 1) {
    for (let z = 3; z <= 8; z += 1) blocks.set(toKey(x, 1, z), 1);
  }
  return blocks;
}

function standing(): Body {
  return { x: 0, y: 0.5, z: 0, onGround: true };
}

function run(
  blocks: Map<BlockKey, number>,
  body: Body,
  motion: ReturnType<typeof createMotionState>,
  input: MoveInput,
  frames: number,
  fps: number,
): number {
  let peak = body.y;
  for (let i = 0; i < frames; i += 1) {
    stepPlayer(blocks, body, motion, input, 1 / fps);
    peak = Math.max(peak, body.y);
  }
  return peak;
}

test("jump height does not depend on the frame rate", () => {
  const heights = [30, 60, 120, 144, 240].map((fps) => {
    const body = standing();
    const motion = createMotionState();
    const peak = run(ground(), body, motion, { ...STILL, jump: true }, fps, fps);
    return peak - 0.5;
  });

  const lowest = Math.min(...heights);
  const highest = Math.max(...heights);
  assert.ok(
    highest - lowest < 0.02,
    `jump height varied between ${lowest.toFixed(3)} and ${highest.toFixed(3)}`,
  );
});

test("a jump clears a one-block step at every frame rate", () => {
  for (const fps of [30, 60, 120, 144, 240]) {
    const body = standing();
    const motion = createMotionState();
    const peak = run(ground(), body, motion, { ...STILL, jump: true }, fps, fps);
    assert.ok(
      peak - 0.5 > 1.0,
      `at ${fps} fps the jump reached only ${(peak - 0.5).toFixed(3)} blocks`,
    );
  }
});

test("a jump does not reach two blocks", () => {
  const body = standing();
  const motion = createMotionState();
  const peak = run(ground(), body, motion, { ...STILL, jump: true }, 120, 60);
  assert.ok(peak - 0.5 < 2.0, `jump reached ${(peak - 0.5).toFixed(3)} blocks`);
});

test("holding jump gives one jump, not a bounce on every landing", () => {
  const body = standing();
  const motion = createMotionState();
  const blocks = ground();
  const input = { ...STILL, jump: true };

  let takeoffs = 0;
  let wasOnGround = true;
  for (let i = 0; i < 240; i += 1) {
    stepPlayer(blocks, body, motion, input, 1 / 60);
    if (wasOnGround && !body.onGround) takeoffs += 1;
    wasOnGround = body.onGround;
  }

  assert.equal(takeoffs, 1, `left the ground ${takeoffs} times while holding jump`);
  assert.equal(body.onGround, true, "should have settled back on the ground");
});

test("releasing and pressing jump again does jump again", () => {
  const body = standing();
  const motion = createMotionState();
  const blocks = ground();

  // First jump, then land while holding.
  for (let i = 0; i < 60; i += 1) {
    stepPlayer(blocks, body, motion, { ...STILL, jump: true }, 1 / 60);
  }
  assert.equal(body.onGround, true, "should be back on the ground");

  // Release, then press again.
  stepPlayer(blocks, body, motion, STILL, 1 / 60);
  stepPlayer(blocks, body, motion, { ...STILL, jump: true }, 1 / 60);
  assert.equal(body.onGround, false, "a fresh press should leave the ground");
});

test("the player can jump up onto a one-block step while walking at it", () => {
  const blocks = withStep();
  const body = standing();
  const motion = createMotionState();
  // Walking straight along +z, which is where the step is.
  const input: MoveInput = {
    forward: 1,
    strafe: 0,
    jump: true,
    sneak: false,
    headingX: 0,
    headingZ: 1,
  };

  for (let i = 0; i < 90; i += 1) stepPlayer(blocks, body, motion, input, 1 / 60);

  assert.ok(body.z > 3, `should have got past the step edge, stopped at z ${body.z.toFixed(2)}`);
  assert.ok(body.y > 1.4, `should be standing on the step, feet at ${body.y.toFixed(2)}`);
});

test("walking off an edge falls rather than floating", () => {
  const blocks = new Map<BlockKey, number>();
  for (let x = -8; x <= 8; x += 1) {
    for (let z = -8; z <= 0; z += 1) blocks.set(toKey(x, 0, z), 1);
  }
  const body = standing();
  const motion = createMotionState();
  const input: MoveInput = { ...STILL, forward: 1, headingX: 0, headingZ: 1 };

  for (let i = 0; i < 60; i += 1) stepPlayer(blocks, body, motion, input, 1 / 60);
  assert.ok(body.y < -2, `should have fallen, feet at ${body.y.toFixed(2)}`);
});

test("sneaking is slower than walking", () => {
  const walk = standing();
  const sneak = standing();
  const input: MoveInput = { ...STILL, forward: 1, headingX: 0, headingZ: 1 };

  for (let i = 0; i < 30; i += 1) {
    stepPlayer(ground(), walk, createMotionState(), input, 1 / 60);
  }
  for (let i = 0; i < 30; i += 1) {
    stepPlayer(ground(), sneak, createMotionState(), { ...input, sneak: true }, 1 / 60);
  }
  assert.ok(sneak.z < walk.z, "sneaking should cover less ground");
});
