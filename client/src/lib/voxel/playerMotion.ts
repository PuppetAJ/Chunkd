import { moveBody, type Body } from "./collision.ts";
import type { BlockKey } from "./coords.ts";

/**
 * How the player moves.
 *
 * This is deliberately a plain function rather than something buried in a React
 * component, so the way jumping and walking actually behave can be tested
 * directly instead of only being judged by playing the game.
 */

export const WALK_SPEED = 6;
export const SNEAK_SPEED = 3;
export const GRAVITY = -30;

/**
 * Upward speed at the start of a jump.
 *
 * Peak height is JUMP_SPEED squared over twice gravity, so this reaches roughly
 * 1.18 blocks: enough to step onto a single block with margin to spare, and not
 * enough to reach two. The previous value of 8 aimed at 1.07 blocks but never
 * achieved it, because gravity was subtracted from the impulse before the
 * player had moved.
 */
export const JUMP_SPEED = 8.4;

export const TERMINAL_VELOCITY = -50;

/** The longest frame worth simulating. A backgrounded tab produces enormous ones. */
export const MAX_TIMESTEP = 1 / 30;

export interface MotionState {
  verticalSpeed: number;
  /**
   * True once a jump has been started and the key has not been released.
   * Without this, holding the jump key jumps again the instant the player
   * touches down, so they never appear to land.
   */
  jumpHeld: boolean;
}

export interface MoveInput {
  /** -1 back, 0 still, 1 forward. */
  forward: number;
  /** -1 left, 0 still, 1 right. */
  strafe: number;
  jump: boolean;
  sneak: boolean;
  /** The view direction, flattened and normalised. */
  headingX: number;
  headingZ: number;
}

export function createMotionState(): MotionState {
  return { verticalSpeed: 0, jumpHeld: false };
}

export function stepPlayer(
  blocks: Map<BlockKey, number>,
  body: Body,
  motion: MotionState,
  input: MoveInput,
  delta: number,
): void {
  const dt = Math.min(delta, MAX_TIMESTEP);

  let vx = 0;
  let vz = 0;
  if (input.forward !== 0 || input.strafe !== 0) {
    const speed = input.sneak ? SNEAK_SPEED : WALK_SPEED;
    const length = Math.hypot(input.forward, input.strafe);
    // Right is the heading turned a quarter turn: (-z, x).
    vx = ((input.forward * input.headingX + input.strafe * -input.headingZ) / length) * speed;
    vz = ((input.forward * input.headingZ + input.strafe * input.headingX) / length) * speed;
  }

  // A jump needs a fresh press. Holding the key gives one jump, not a bounce
  // on every landing.
  if (input.jump) {
    if (!motion.jumpHeld && body.onGround) {
      motion.verticalSpeed = JUMP_SPEED;
      motion.jumpHeld = true;
    }
  } else {
    motion.jumpHeld = false;
  }

  // Integrate over the average of the speeds at the start and end of the frame.
  // Using only the end speed, as before, meant one frame of gravity was applied
  // before the jump had lifted the player at all, which both lowered the jump
  // and made its height depend on the frame rate.
  const startSpeed = motion.verticalSpeed;
  const endSpeed = Math.max(TERMINAL_VELOCITY, startSpeed + GRAVITY * dt);
  const dy = ((startSpeed + endSpeed) / 2) * dt;
  motion.verticalSpeed = endSpeed;

  moveBody(blocks, body, vx * dt, dy, vz * dt);

  // Landing or hitting a ceiling cancels vertical momentum.
  if (body.onGround && motion.verticalSpeed < 0) motion.verticalSpeed = 0;
}
