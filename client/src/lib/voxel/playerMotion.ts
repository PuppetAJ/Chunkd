import { moveBody, type Body } from "./collision.ts";
import type { BlockKey } from "./coords.ts";

export const WALK_SPEED = 6;
export const SNEAK_SPEED = 3;
export const GRAVITY = -30;

export const JUMP_SPEED = 9;

export const FLY_SPEED = 9;

export const FLY_HORIZONTAL_MULTIPLIER = 1.8;

export const DOUBLE_TAP_SECONDS = 0.32;

export const TERMINAL_VELOCITY = -50;

export const MAX_TIMESTEP = 1 / 30;

export interface MotionState {
  verticalSpeed: number;
  jumpHeld: boolean;
  flying: boolean;
  elapsed: number;
  lastJumpPressAt: number;
}

export interface MoveInput {
  forward: number;
  strafe: number;
  jump: boolean;
  sneak: boolean;
  headingX: number;
  headingZ: number;
}

export function createMotionState(): MotionState {
  return {
    verticalSpeed: 0,
    jumpHeld: false,
    flying: false,
    elapsed: 0,
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

  const freshPress = input.jump && !motion.jumpHeld;
  if (freshPress) {
    if (motion.elapsed - motion.lastJumpPressAt < DOUBLE_TAP_SECONDS) {
      motion.flying = !motion.flying;
      motion.verticalSpeed = 0;
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
    const startSpeed = motion.verticalSpeed;
    const endSpeed = Math.max(TERMINAL_VELOCITY, startSpeed + GRAVITY * dt);
    dy = ((startSpeed + endSpeed) / 2) * dt;
    motion.verticalSpeed = endSpeed;
  }

  moveBody(blocks, body, vx * dt, dy, vz * dt);

  if (body.onGround && motion.verticalSpeed < 0) motion.verticalSpeed = 0;
}

export const STRAY_MARGIN = 32;

export function hasStrayed(x: number, z: number, size: number): boolean {
  return x < -STRAY_MARGIN || z < -STRAY_MARGIN || x > size + STRAY_MARGIN || z > size + STRAY_MARGIN;
}
