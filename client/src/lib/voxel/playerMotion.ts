import { moveBody, type Body } from "./collision.ts";
import type { BlockKey } from "./coords.ts";

export const WALK_SPEED = 6;
export const SNEAK_SPEED = 3;
export const GRAVITY = -30;

/**
 * Peaks at about 1.35 blocks: enough clearance to place a block under your own
 * feet, which needs more than a whole block.
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
  /** Set while the key is held, so holding jump gives one jump rather than a bounce on every landing. */
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

  // A second press within the window toggles flight, as creative mode does.
  const freshPress = input.jump && !motion.jumpHeld;
  if (freshPress) {
    if (motion.elapsed - motion.lastJumpPressAt < DOUBLE_TAP_SECONDS) {
      motion.flying = !motion.flying;
      motion.verticalSpeed = 0;
      // Consume the pair, so a third tap starts a new one rather than toggling back.
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

  if (freshPress && !motion.flying && body.onGround) {
    motion.verticalSpeed = JUMP_SPEED;
  }
  motion.jumpHeld = input.jump;

  let dy: number;
  if (motion.flying) {
    motion.verticalSpeed = 0;
    dy = ((input.jump ? FLY_SPEED : 0) - (input.sneak ? FLY_SPEED : 0)) * dt;
  } else {
    // Average the start and end speeds, or the jump height depends on the frame rate.
    const startSpeed = motion.verticalSpeed;
    const endSpeed = Math.max(TERMINAL_VELOCITY, startSpeed + GRAVITY * dt);
    dy = ((startSpeed + endSpeed) / 2) * dt;
    motion.verticalSpeed = endSpeed;
  }

  moveBody(blocks, body, vx * dt, dy, vz * dt);

  if (body.onGround && motion.verticalSpeed < 0) motion.verticalSpeed = 0;
}

/** How far past the edge before being put back at spawn: room to fly out and look at a build. */
export const STRAY_MARGIN = 32;

/** Height is left out on purpose: building tall is the point, and falling has its own check. */
export function hasStrayed(x: number, z: number, size: number): boolean {
  return x < -STRAY_MARGIN || z < -STRAY_MARGIN || x > size + STRAY_MARGIN || z > size + STRAY_MARGIN;
}
