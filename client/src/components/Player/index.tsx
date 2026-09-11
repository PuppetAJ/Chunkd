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
  stepPlayer,
  type MoveInput,
} from "../../lib/voxel/playerMotion.ts";

/** Below this the player has fallen out of the world. */
const VOID_HEIGHT = -20;

/** How the tool sits in view. Raised and enlarged so the handle leaves frame. */
const AXE_SCALE = 1.1;
const AXE_OFFSET = { right: 0.34, up: -0.57, forward: -0.55 };

/** How long one swing takes. Under the 160ms repeat delay, so a held button
 *  gives separate strikes rather than one continuous blur. */
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
  const spawnPoint = useWorldStore((state) => state.spawnPoint);

  useKeyPress((code) => {
    if (isEditorPaused()) return;
    // Digit1 to Digit9 choose a hotbar slot.
    if (code.startsWith("Digit")) {
      const slot = Number(code.slice(5));
      if (slot >= 1 && slot <= HOTBAR_SLOTS) setSelectedSlot(slot);
    }
    // R steps the selected slot through the shapes that block can take. It
    // belongs to the slot rather than being one global setting, so a block and
    // its slab can sit side by side on the hotbar.
    if (code === "KeyR") cycleSelectedShape();
  });

  // How much scrolling counts as one step along the hotbar. A mouse wheel sends
  // one large event per notch, a trackpad a stream of small ones, so distance is
  // accumulated rather than events counted. The threshold is one wheel notch, so
  // a mouse moves exactly one slot per click of the wheel.
  const scrolled = useRef(0);
  useEffect(() => {
    const NOTCH = 100;
    const onWheel = (event: WheelEvent) => {
      // A wheel event carrying ctrl is a pinch, not a scroll. It is refused
      // elsewhere; here it just must not also move along the hotbar.
      if (event.ctrlKey) return;
      if (isEditorPaused()) return;

      // Changing direction starts again, so leftover distance from a scroll one
      // way cannot make the first step back happen early.
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
    // While paused nothing about the player changes: no walking, no falling, no
    // drifting to a stop. The camera is still placed each frame so the view
    // behind the dialog stays exactly where it was.
    if (isEditorPaused()) {
      // Keys released while the dialog had focus never reached the world, so
      // clearing them here stops the player walking off the moment play
      // resumes.
      held.current.clear();
      // Movement has no inertia: speed is derived from the held keys every
      // frame, so an empty key set is a standing player. Vertical speed is left
      // alone on purpose, so pausing mid-fall resumes the fall rather than
      // cancelling it.
      motion.jumpHeld = false;
      camera.position.set(body.x, body.y + EYE_HEIGHT, body.z);
      return;
    }

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
        // The walking bob is eased towards rather than set, so it has to be
        // tracked separately now that the swing is added on top of it. Writing
        // the total back into rotation.x and easing from that would make each
        // swing drag the bob along with it.
        bob.current = THREE.MathUtils.lerp(
          bob.current,
          Math.sin(walking * state.clock.elapsedTime * 10) / 6,
          0.1,
        );

        // One arc out and back, from a sine over the swing's length. Short
        // enough to finish inside the repeat delay, so holding the button reads
        // as a series of strikes rather than one blurred movement.
        const elapsed = sinceSwing();
        const swing =
          elapsed < SWING_MS ? Math.sin((elapsed / SWING_MS) * Math.PI) * SWING_REACH : 0;

        // Subtracted: turning the tool the positive way about this axis tips
        // its head back towards the player, which reads as a swing backwards.
        axeHead.rotation.x = bob.current - swing;
      }
      axe.quaternion.copy(camera.quaternion);
      axe.position.copy(camera.position);
      axe.translateX(AXE_OFFSET.right);
      axe.translateY(AXE_OFFSET.up);
      axe.translateZ(AXE_OFFSET.forward);
    }
  });

  // Development-only handle on the held tool, so a test can watch it swing.
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
