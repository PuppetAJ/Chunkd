import { moveBody, type Body } from "./collision.ts";
import type { BlockKey } from "./coords.ts";

/**
 * How the player moves. A plain function rather than something inside a React
 * component, so jumping and walking can be tested directly.
 */

export const WALK_SPEED = 6;
export const SNEAK_SPEED = 3;
export const GRAVITY = -30;

/**
 * Upward speed at the start of a jump, which peaks at roughly 1.35 blocks. The
 * height matters: building a pillar means placing a block under your own feet,
 * which is only legal while they are more than a block clear of the ground.
 */
export const JUMP_SPEED = 9;

/** Vertical speed while flying, in blocks per second. */
export const FLY_SPEED = 9;

/** Flying moves faster horizontally than walking, to cross the world. */
export const FLY_HORIZONTAL_MULTIPLIER = 1.8;

/** Two jump presses closer together than this toggle flight. */
export const DOUBLE_TAP_SECONDS = 0.32;

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
  /** Creative flight: gravity off, jump rises, sneak descends. */
  flying: boolean;
  /** Seconds since this player started, used only to time the double tap. */
  elapsed: number;
  /** When the jump key was last pressed, for double-tap detection. */
  lastJumpPressAt: number;
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
  return {
    verticalSpeed: 0,
    jumpHeld: false,
    flying: false,
    elapsed: 0,
    // Far enough in the past that the first press is never a double tap.
    lastJumpPressAt: -Infinity,
  };
}

export function stepPlayer(
  blocks: Map<BlockKey, number>,
  body: Body,
  motion: MotionState,
  input: MoveInput,
  delta: number,
): void {
  const dt = Math.min(delta, MAX_TIMESTEP);
  motion.elapsed += dt;

  // A second jump press soon after the first toggles flight, the way creative
  // mode does. The first press has already produced a jump by then, which is
  // what makes the gesture feel like taking off.
  const freshPress = input.jump && !motion.jumpHeld;
  if (freshPress) {
    if (motion.elapsed - motion.lastJumpPressAt < DOUBLE_TAP_SECONDS) {
      motion.flying = !motion.flying;
      motion.verticalSpeed = 0;
      // Consume the pair, so a third tap starts a new one rather than
      // toggling straight back.
      motion.lastJumpPressAt = -Infinity;
    } else {
      motion.lastJumpPressAt = motion.elapsed;
    }
  }

  let vx = 0;
  let vz = 0;
  if (input.forward !== 0 || input.strafe !== 0) {
    const base = input.sneak && !motion.flying ? SNEAK_SPEED : WALK_SPEED;
    const speed = motion.flying ? base * FLY_HORIZONTAL_MULTIPLIER : base;
    const length = Math.hypot(input.forward, input.strafe);
    // Right is the heading turned a quarter turn: (-z, x).
    vx = ((input.forward * input.headingX + input.strafe * -input.headingZ) / length) * speed;
    vz = ((input.forward * input.headingZ + input.strafe * input.headingX) / length) * speed;
  }

  // A jump needs a fresh press. Holding the key gives one jump, not a bounce
  // on every landing.
  if (freshPress && !motion.flying && body.onGround) {
    motion.verticalSpeed = JUMP_SPEED;
  }
  motion.jumpHeld = input.jump;

  let dy: number;
  if (motion.flying) {
    // No gravity while flying; the keys drive height directly.
    motion.verticalSpeed = 0;
    dy = ((input.jump ? FLY_SPEED : 0) - (input.sneak ? FLY_SPEED : 0)) * dt;
  } else {
    // Integrate over the average of the speeds at the start and end of the
    // frame. Using only the end speed, as before, meant one frame of gravity
    // was applied before the jump had lifted the player at all, which both
    // lowered the jump and made its height depend on the frame rate.
    const startSpeed = motion.verticalSpeed;
    const endSpeed = Math.max(TERMINAL_VELOCITY, startSpeed + GRAVITY * dt);
    dy = ((startSpeed + endSpeed) / 2) * dt;
    motion.verticalSpeed = endSpeed;
  }

  moveBody(blocks, body, vx * dt, dy, vz * dt);

  // Landing or hitting a ceiling cancels vertical momentum.
  if (body.onGround && motion.verticalSpeed < 0) motion.verticalSpeed = 0;
}
