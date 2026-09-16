import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import Axe from "../Axe/index.jsx";
import { useHeldKeys, useKeyPress } from "../../lib/useKeyboard.ts";
import { HOTBAR_SLOTS, useWorldStore } from "../../lib/voxel/worldStore.ts";
import { isEditorPaused, sinceSwing, useEditorUiStore } from "../../lib/editorUiStore.ts";
import { EYE_HEIGHT, type Body } from "../../lib/voxel/collision.ts";
import {
  createMotionState,
  hasStrayed,
  stepPlayer,
  type MoveInput,
} from "../../lib/voxel/playerMotion.ts";

/** Below this the player has fallen out of the world. */
const VOID_HEIGHT = -20;

/** How the tool sits in view. Raised and enlarged so the handle leaves frame. */
const AXE_SCALE = 1.1;
const AXE_OFFSET = { right: 0.34, up: -0.57, forward: -0.55 };

/** Under the repeat delay, so a held button gives separate strikes. */
const SWING_MS = 150;

/** How far the head travels through the swing, in radians. */
const SWING_REACH = 0.9;

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

/** The movement itself is in lib/voxel/playerMotion.ts, where it can be tested without a browser. */
export default function Player({ body }: Props) {
  const { camera } = useThree();
  const held = useHeldKeys();
  const axeRef = useRef<THREE.Group>(null);

  const bob = useRef(0);
  const motion = useMemo(() => createMotionState(), []);
  const heading = useMemo(() => new THREE.Vector3(), []);
  const input = useMemo<MoveInput>(
    () => ({ forward: 0, strafe: 0, jump: false, sneak: false, headingX: 0, headingZ: -1 }),
    [],
  );

  const setSelectedSlot = useWorldStore((state) => state.setSelectedSlot);
  const cycleSelectedSlot = useWorldStore((state) => state.cycleSelectedSlot);
  const cycleSelectedShape = useWorldStore((state) => state.cycleSelectedShape);
  const cycleBrush = useWorldStore((state) => state.cycleBrush);
  const spawnPoint = useWorldStore((state) => state.spawnPoint);

  useKeyPress((code, shift) => {
    if (isEditorPaused()) return;
    if (code.startsWith("Digit")) {
      const slot = Number(code.slice(5));
      if (slot >= 1 && slot <= HOTBAR_SLOTS) setSelectedSlot(slot);
    }
    if (code === "KeyR") cycleSelectedShape();
    if (code === "Backquote") cycleBrush(shift ? -1 : 1);
  });

  // A wheel sends one large event per notch, a trackpad a stream of small ones,
  // so distance is accumulated. The threshold is one wheel notch.
  const scrolled = useRef(0);
  useEffect(() => {
    const NOTCH = 100;
    const onWheel = (event: WheelEvent) => {
      // A wheel event carrying ctrl is a pinch, not a scroll.
      if (event.ctrlKey) return;
      if (isEditorPaused()) return;

      // Changing direction starts again, so leftover distance cannot make the first step back early.
      if (Math.sign(event.deltaY) !== Math.sign(scrolled.current)) scrolled.current = 0;

      scrolled.current += event.deltaY;
      while (Math.abs(scrolled.current) >= NOTCH) {
        const direction = scrolled.current > 0 ? 1 : -1;
        cycleSelectedSlot(direction);
        scrolled.current -= direction * NOTCH;
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [cycleSelectedSlot]);

  useFrame((state, delta) => {
    // The camera is still placed while paused, so the view behind the dialog holds.
    if (isEditorPaused()) {
      // Releases while the dialog had focus never arrived, so the keys are cleared here.
      held.current.clear();
      // Vertical speed is left alone on purpose, so pausing mid-fall resumes the fall.
      motion.jumpHeld = false;
      camera.position.set(body.x, body.y + EYE_HEIGHT, body.z);
      return;
    }

    const keys = held.current;
    const pressed = (codes: string[]) => codes.some((code) => keys.has(code));

    // camera.rotation.y stops meaning "heading" once the view tilts under pointer
    // lock; the flattened view direction does not.
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

    if (body.y < VOID_HEIGHT || hasStrayed(body.x, body.z, useWorldStore.getState().size)) {
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
        // Tracked apart from the swing: easing from rotation.x would drag the
        // bob along with each swing.
        bob.current = THREE.MathUtils.lerp(
          bob.current,
          Math.sin(walking * state.clock.elapsedTime * 10) / 6,
          0.1,
        );

        const elapsed = sinceSwing();
        const swing =
          elapsed < SWING_MS ? Math.sin((elapsed / SWING_MS) * Math.PI) * SWING_REACH : 0;

        // Subtracted: positive tips the head back towards the player.
        axeHead.rotation.x = bob.current - swing;
      }
      axe.quaternion.copy(camera.quaternion);
      axe.position.copy(camera.position);
      axe.translateX(AXE_OFFSET.right);
      axe.translateY(AXE_OFFSET.up);
      axe.translateZ(AXE_OFFSET.forward);
    }
  });

  // For the tests.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__axe = axeRef.current ?? undefined;
    return () => {
      delete window.__axe;
    };
  }, []);

  return (
    <group ref={axeRef} scale={AXE_SCALE}>
      <Axe />
    </group>
  );
}
