import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import Axe from "../Axe/index.jsx";
import { useHeldKeys, useKeyPress } from "../../lib/useKeyboard.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { BLOCKS } from "../../lib/voxel/blocks.ts";
import { EYE_HEIGHT, moveBody, type Body } from "../../lib/voxel/collision.ts";

const WALK_SPEED = 6;
const SNEAK_SPEED = 3;
const GRAVITY = -30;
const JUMP_SPEED = 8;
const TERMINAL_VELOCITY = -50;
/** Below this the player has fallen out of the world. */
const VOID_HEIGHT = -20;

const KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  jump: ["Space"],
  sneak: ["ShiftLeft", "ShiftRight"],
};

interface Props {
  body: Body;
}

/**
 * Moves the player and drives the camera.
 *
 * There is no rigid body here any more. The player is an upright box resolved
 * against the block map, which makes breaking and placing blocks free: there
 * are no colliders to rebuild.
 */
export default function Player({ body }: Props) {
  const { camera } = useThree();
  const held = useHeldKeys();
  const axeRef = useRef<THREE.Group>(null);
  const verticalSpeed = useRef(0);

  const setSelectedSlot = useWorldStore((state) => state.setSelectedSlot);
  const spawnPoint = useWorldStore((state) => state.spawnPoint);

  useKeyPress((code) => {
    // Digit1 to Digit9 choose a hotbar slot.
    if (code.startsWith("Digit")) {
      const slot = Number(code.slice(5));
      if (slot >= 1 && slot <= BLOCKS.length) setSelectedSlot(slot);
    }
  });

  useFrame((state, delta) => {
    const blocks = useWorldStore.getState().blocks;

    // A backgrounded tab produces one enormous delta on return, which would
    // teleport the player through the floor.
    const dt = Math.min(delta, 1 / 30);
    const keys = held.current;
    const pressed = (codes: string[]) => codes.some((code) => keys.has(code));

    const forward = Number(pressed(KEYS.forward)) - Number(pressed(KEYS.backward));
    const strafe = Number(pressed(KEYS.right)) - Number(pressed(KEYS.left));
    const speed = pressed(KEYS.sneak) ? SNEAK_SPEED : WALK_SPEED;

    let vx = 0;
    let vz = 0;
    if (forward !== 0 || strafe !== 0) {
      const length = Math.hypot(forward, strafe);
      // Only the yaw matters. Using the full camera rotation, as the old code
      // did, made walking speed depend on how far up or down you were looking.
      const yaw = camera.rotation.y;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      vx = ((forward / length) * -sin + (strafe / length) * cos) * speed;
      vz = ((forward / length) * -cos + (strafe / length) * -sin) * speed;
    }

    if (pressed(KEYS.jump) && body.onGround) verticalSpeed.current = JUMP_SPEED;

    verticalSpeed.current = Math.max(
      TERMINAL_VELOCITY,
      verticalSpeed.current + GRAVITY * dt,
    );

    moveBody(blocks, body, vx * dt, verticalSpeed.current * dt, vz * dt);

    // Landing or hitting a ceiling cancels vertical momentum.
    if (body.onGround && verticalSpeed.current < 0) verticalSpeed.current = 0;

    if (body.y < VOID_HEIGHT) {
      const [x, y, z] = spawnPoint();
      body.x = x;
      body.y = y;
      body.z = z;
      verticalSpeed.current = 0;
    }

    camera.position.set(body.x, body.y + EYE_HEIGHT, body.z);

    const axe = axeRef.current;
    if (axe) {
      const axeHead = axe.children[0];
      if (axeHead) {
        const walking = Math.hypot(vx, vz) > 0.1 ? 1 : 0;
        axeHead.rotation.x = THREE.MathUtils.lerp(
          axeHead.rotation.x,
          Math.sin(walking * state.clock.elapsedTime * 10) / 6,
          0.1,
        );
      }
      axe.rotation.copy(camera.rotation);
      axe.position.copy(camera.position);
      axe.translateX(0.3);
      axe.translateY(-0.35);
      axe.translateZ(-0.9);
    }
  });

  return (
    <group ref={axeRef}>
      <Axe />
    </group>
  );
}
