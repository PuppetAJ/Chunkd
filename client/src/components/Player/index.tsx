import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import Axe from "../Axe/index.jsx";
import { useHeldKeys, useKeyPress } from "../../lib/useKeyboard.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { useEditorUiStore } from "../../lib/editorUiStore.ts";
import { BLOCKS } from "../../lib/voxel/blocks.ts";
import { EYE_HEIGHT, type Body } from "../../lib/voxel/collision.ts";
import {
  createMotionState,
  stepPlayer,
  type MoveInput,
} from "../../lib/voxel/playerMotion.ts";

/** Below this the player has fallen out of the world. */
const VOID_HEIGHT = -20;

/** How the tool sits in view. Raised and enlarged so the handle leaves frame. */
const AXE_SCALE = 1.1;
const AXE_OFFSET = { right: 0.34, up: -0.57, forward: -0.55 };

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
 * Reads the keyboard and the camera, and drives the player.
 *
 * The movement itself lives in lib/voxel/playerMotion.ts so it can be tested
 * without a browser. This component only translates input into that function's
 * arguments and puts the camera and the held tool where the result says.
 */
export default function Player({ body }: Props) {
  const { camera } = useThree();
  const held = useHeldKeys();
  const axeRef = useRef<THREE.Group>(null);

  const motion = useMemo(createMotionState, []);
  const heading = useMemo(() => new THREE.Vector3(), []);
  const input = useMemo<MoveInput>(
    () => ({ forward: 0, strafe: 0, jump: false, sneak: false, headingX: 0, headingZ: -1 }),
    [],
  );

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
    const keys = held.current;
    const pressed = (codes: string[]) => codes.some((code) => keys.has(code));

    // Pointer lock stores the view as a quaternion, and camera.rotation.y is a
    // re-derived XYZ Euler whose middle axis stops meaning "heading" once the
    // view tilts. The flattened view direction has no such ambiguity.
    camera.getWorldDirection(heading);
    heading.y = 0;
    if (heading.lengthSq() < 1e-6) heading.set(0, 0, -1);
    heading.normalize();

    input.forward = Number(pressed(KEYS.forward)) - Number(pressed(KEYS.backward));
    input.strafe = Number(pressed(KEYS.right)) - Number(pressed(KEYS.left));
    input.jump = pressed(KEYS.jump);
    input.sneak = pressed(KEYS.sneak);
    input.headingX = heading.x;
    input.headingZ = heading.z;

    stepPlayer(useWorldStore.getState().blocks, body, motion, input, delta);

    // Only touches the store on a change, so this does not re-render per frame.
    if (useEditorUiStore.getState().flying !== motion.flying) {
      useEditorUiStore.getState().setFlying(motion.flying);
    }

    if (body.y < VOID_HEIGHT) {
      const [x, y, z] = spawnPoint();
      body.x = x;
      body.y = y;
      body.z = z;
      motion.verticalSpeed = 0;
    }

    camera.position.set(body.x, body.y + EYE_HEIGHT, body.z);

    const axe = axeRef.current;
    if (axe) {
      const axeHead = axe.children[0];
      if (axeHead) {
        const walking = input.forward !== 0 || input.strafe !== 0 ? 1 : 0;
        axeHead.rotation.x = THREE.MathUtils.lerp(
          axeHead.rotation.x,
          Math.sin(walking * state.clock.elapsedTime * 10) / 6,
          0.1,
        );
      }
      axe.quaternion.copy(camera.quaternion);
      axe.position.copy(camera.position);
      axe.translateX(AXE_OFFSET.right);
      axe.translateY(AXE_OFFSET.up);
      axe.translateZ(AXE_OFFSET.forward);
    }
  });

  return (
    <group ref={axeRef} scale={AXE_SCALE}>
      <Axe />
    </group>
  );
}
