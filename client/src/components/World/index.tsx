import { use, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import BlockLayer from "./BlockLayer.tsx";
import { getBlock } from "../../lib/voxel/blocks.ts";
import { toKey, type BlockKey } from "../../lib/voxel/coords.ts";
import { buildRenderLayers, groupVisible } from "../../lib/voxel/render.ts";
import {
  axisForFaceNormal,
  blockIdOf,
  blockShapeOf,
  facingForYaw,
  isSlab,
  isTrapdoor,
  slabShapeForPlacement,
  stairsShapeForPlacement,
  trapdoorFacingForPlacement,
  trapdoorTopForPlacement,
  verticalExtent,
  SHAPE_SLAB_BOTTOM,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_TRAPDOOR,
} from "../../lib/voxel/blockValue.ts";
import { brushCells } from "../../lib/voxel/brush.ts";
import { raycastBlocks } from "../../lib/voxel/raycast.ts";
import { loadBlockTextures } from "../../lib/blockTextures.ts";
import { isEditorPaused, swingTool } from "../../lib/editorUiStore.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { blockOverlapsPlayer, type Body } from "../../lib/voxel/collision.ts";

/** How far the player can reach to break or place. */
const REACH = 7;

/** What the crosshair is currently on. */
interface Target {
  /** The block being looked at. */
  hit: [number, number, number];
  /** The empty cell on the face being looked at, where a new block would go. */
  adjacent: [number, number, number];
  /** Which way a block with a grain should lie if placed here. */
  axis: number;
  /** The face's normal, which a brush lies flat against. */
  normal: [number, number, number];
  /** How far up the face the crosshair is, from -0.5 at its foot to 0.5 at its top. */
  heightInCell: number;
  /** The up component of the face's normal, which says whether it is a top, a bottom or a side. */
  normalY: number;
}

/**
 * Delay between repeats while a mouse button is held. Wall-clock rather than
 * the render clock: a dropped frame would otherwise let one click act twice.
 */
const REPEAT_MS = 160;

/** How long to wait for the browser to answer a lock request before acting anyway. */
const LOCK_ANSWER_MS = 250;

/**
 * Stand-ins for the mouse buttons, for trackpads. They map onto the same button
 * numbers, so they inherit hold-to-repeat and everything else.
 */
const KEY_BUTTONS: Record<string, number> = {
  KeyC: 0,
  KeyF: 2,
};

/** Picking a block: the middle button as in the game, and a key for mice without one. */
const PICK_BUTTON = 1;
const PICK_KEY = "KeyQ";

interface Props {
  /** Defaults to the editor's world; the build viewer passes its own. */
  blocks?: Map<BlockKey, number>;
  playerBody?: Body;
  editable?: boolean;
}

export default function World({ blocks: providedBlocks, playerBody, editable = false }: Props) {
  const storeBlocks = useWorldStore((state) => state.blocks);
  const storeVisible = useWorldStore((state) => state.visible);
  const blocks = providedBlocks ?? storeBlocks;
  const placeBlocks = useWorldStore((state) => state.placeBlocks);
  const removeBlocks = useWorldStore((state) => state.removeBlocks);
  const pickBlock = useWorldStore((state) => state.pickBlock);
  const brush = useWorldStore((state) => state.brush);
  const fillSlab = useWorldStore((state) => state.fillSlab);
  const toggleTrapdoor = useWorldStore((state) => state.toggleTrapdoor);
  const selectedShape = useWorldStore((state) => state.selectedShape);
  const selectedBlockId = useWorldStore((state) => state.selectedBlockId);

  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const highlightRef = useRef<THREE.LineSegments>(null);

  // A ref rather than state: this is written every frame.
  const target = useRef<Target | null>(null);

  /** Which mouse button is held, and the earliest time it may act again. */
  const heldButton = useRef<number | null>(null);
  // Shift at the moment of pressing, which decides whether using a trapdoor
  // opens it or builds against it.
  const sneaking = useRef(false);
  // Whether the browser has handed over the mouse at any point. See onPointerDown.
  const lockGranted = useRef(false);
  const nextActionAt = useRef(0);

  // Shared and never rejects, so a missing image costs one block its texture
  // rather than costing the editor its WebGL context.
  const textures = use(loadBlockTextures());

  // Nothing moves except the player, who casts no shadow, so the shadow map
  // only needs redrawing when the world changes.
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, blocks, storeVisible]);

  const layers = useMemo(() => {
    // The editor keeps its visible set up to date as blocks are placed, so only
    // the grouping is redone. A build viewer's world is worked out in full.
    const raw = providedBlocks
      ? buildRenderLayers(providedBlocks)
      : groupVisible(storeVisible, blocks);
    // For the tests: a stair's shape comes from its neighbours, so this is the
    // only place that knows what was drawn.
    if (import.meta.env.DEV && editable) window.__layers = raw;
    return raw.flatMap((layer) => {
      const block = getBlock(layer.blockId);
      return block
        ? [
            {
              block,
              shape: layer.shape,
              variant: layer.variant,
              positions: layer.positions,
              axes: layer.axes,
            },
          ]
        : [];
    });
  }, [providedBlocks, storeVisible, blocks, editable]);

  const raycaster = useMemo(() => {
    const instance = new THREE.Raycaster();
    // Carried into the ray test for the shapes that are not whole cubes.
    instance.far = REACH;
    return instance;
  }, []);
  const screenCentre = useMemo(() => new THREE.Vector2(0, 0), []);
  // Reused rather than allocated every frame.
  const lookDirection = useMemo(() => new THREE.Vector3(), []);

  // A ref so the pointer handlers need not be re-created, and so the frame loop
  // can repeat the action while a button is held.
  const clearTarget = () => {
    target.current = null;
    if (highlightRef.current) highlightRef.current.visible = false;
  };

  const act = useRef<(button: number, fresh: boolean) => void>(() => {});
  act.current = (button: number, fresh: boolean) => {
    const current = findTarget();
    if (!current) return;

    // On a hit rather than on the press, so waving at the sky does not animate.
    swingTool();

    if (button === 0) {
      removeBlocks(brushCells(...current.hit, ...current.normal, brush));
      return;
    }

    if (button === 2) {
      const chosenShape = selectedShape();
      const targeted = blocks.get(toKey(...current.hit));

      // Using a trapdoor opens it; sneaking builds against it instead. Only on
      // the press, or holding the button would flap it. Using something is aimed
      // at one block, so the brush does not apply here or to slabs below.
      if (targeted !== undefined && isTrapdoor(targeted) && !sneaking.current) {
        if (fresh) toggleTrapdoor(...current.hit);
        return;
      }

      // Two slabs of the same block make a whole one, but only when the exposed
      // half is the one being built on: from the side, a slab places a neighbour.
      if (
        chosenShape === SHAPE_SLAB_BOTTOM &&
        targeted !== undefined &&
        isSlab(targeted) &&
        blockIdOf(targeted) === selectedBlockId() &&
        (blockShapeOf(targeted) === SHAPE_SLAB_BOTTOM
          ? current.normalY > 0.5
          : current.normalY < -0.5)
      ) {
        fillSlab(...current.hit);
        return;
      }

      const [x, y, z] = current.adjacent;
      // Refuse to place a block inside the player, which would trap them. Only
      // that cell is dropped, so a brush still fills the rest of its square.
      const cells = brushCells(x, y, z, ...current.normal, brush).filter(
        (cell) => !playerBody || !blockOverlapsPlayer(playerBody, ...cell),
      );
      if (cells.length === 0) return;
      // The slot decides the shape, the aim decides which half of the cell.
      let shape = chosenShape;
      if (chosenShape === SHAPE_SLAB_BOTTOM) {
        shape = slabShapeForPlacement(current.normalY, current.heightInCell);
      } else if (chosenShape === SHAPE_STAIRS_BOTTOM) {
        shape = stairsShapeForPlacement(current.normalY, current.heightInCell);
      }

      // From the look direction rather than camera.rotation, which depends on
      // whatever rotation order the controls use.
      camera.getWorldDirection(lookDirection);
      const yaw = Math.atan2(-lookDirection.x, -lookDirection.z);

      if (chosenShape === SHAPE_TRAPDOOR) {
        // A trapdoor hangs from the face it was built against, so that face
        // decides its facing rather than the look direction.
        const [hx, , hz] = current.hit;
        const facing = trapdoorFacingForPlacement(x - hx, z - hz, yaw);
        const top = trapdoorTopForPlacement(current.normalY, current.heightInCell);
        placeBlocks(cells, current.axis, shape, facing, top);
        return;
      }

      placeBlocks(cells, current.axis, shape, facingForYaw(yaw));
    }
  };

  /** Bring whatever the crosshair is on into the hotbar. */
  const pick = useRef<() => void>(() => {});
  pick.current = () => {
    const current = findTarget();
    if (!current) return;
    const value = blocks.get(toKey(...current.hit));
    if (value !== undefined) pickBlock(blockIdOf(value), blockShapeOf(value));
  };

  /**
   * What the crosshair is on, right now. The click handler calls this rather
   * than reading the last frame's answer, which could already be stale.
   */
  const findTarget = (): Target | null => {
    raycaster.setFromCamera(screenCentre, camera);
    const hit = raycastBlocks(blocks, raycaster, REACH);

    if (!hit) {
      // Every way out has to forget the previous target, or the crosshair stays
      // aimed at a block that has already been broken.
      clearTarget();
      return null;
    }

    const block = hit.cell;
    const normal = hit.normal;

    const found: Target = {
      hit: block,
      adjacent: [
        block[0] + Math.round(normal.x),
        block[1] + Math.round(normal.y),
        block[2] + Math.round(normal.z),
      ],
      axis: axisForFaceNormal(normal.x, normal.y, normal.z),
      normal: [normal.x, normal.y, normal.z],
      // A block sits at the centre of its cell whatever its shape.
      heightInCell: hit.point.y - block[1],
      normalY: normal.y,
    };

    target.current = found;
    if (highlightRef.current) {
      // The outline covers the whole brush square, which lies against the face
      // being looked at, so that face's own axis stays one cell deep.
      const wide = Math.abs(normal.x) > 0.5 ? 1 : brush;
      const tall = Math.abs(normal.y) > 0.5 ? 1 : brush;
      const deep = Math.abs(normal.z) > 0.5 ? 1 : brush;

      // A single cell outlines what is actually there, or a slab gets a full
      // cube of wireframe. A square outlines whole cells instead.
      const value = blocks.get(toKey(block[0], block[1], block[2]));
      const [low, high] =
        tall > 1 || value === undefined
          ? [block[1] - tall / 2, block[1] + tall / 2]
          : verticalExtent(value, block[1]);

      highlightRef.current.visible = true;
      highlightRef.current.position.set(block[0], (low + high) / 2, block[2]);
      highlightRef.current.scale.set(wide, high - low, deep);
    }
    return found;
  };

  useFrame(() => {
    if (!editable || !groupRef.current) return;
    if (isEditorPaused()) {
      // A button still down when the world paused must not keep digging.
      heldButton.current = null;
      clearTarget();
      return;
    }

    const now = performance.now();
    if (heldButton.current !== null && now >= nextActionAt.current) {
      act.current(heldButton.current, false);
      nextActionAt.current = now + REPEAT_MS;
    }

    findTarget();
  });

  useEffect(() => {
    if (!editable) return;
    const canvas = gl.domElement;

    // Listening on the canvas covers both buttons; React's onClick only fires
    // for the primary one.
    //
    // With the mouse loose, a click may be the one that takes it back, and that
    // click should do nothing else. Whether it was is only known once the
    // browser answers drei's lock request, so the action waits for the answer:
    // dropped if the lock arrives, carried out if it is refused or never comes.
    // Deciding earlier breaks every click in a browser that stops granting it.
    let waiting: number | null = null;
    let waitingTimer = 0;
    let buttonDown = false;

    const answerLock = (tookLock: boolean) => {
      window.clearTimeout(waitingTimer);
      const button = waiting;
      waiting = null;
      if (button === null || tookLock || isEditorPaused()) return;
      act.current(button, true);
      nextActionAt.current = performance.now() + REPEAT_MS;
      if (buttonDown) heldButton.current = button;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (isEditorPaused()) return;
      if (event.button === PICK_BUTTON) {
        pick.current();
        return;
      }
      sneaking.current = event.shiftKey;
      buttonDown = true;
      // Only once the lock has worked: an automated browser never grants it.
      if (!document.pointerLockElement && lockGranted.current) {
        waiting = event.button;
        return;
      }
      heldButton.current = event.button;
      // Now rather than next frame: a quick click can press and release inside
      // a single frame.
      act.current(event.button, true);
      nextActionAt.current = performance.now() + REPEAT_MS;
    };

    const stop = () => {
      buttonDown = false;
      heldButton.current = null;
      // drei asks for the lock on the click after this release, so the wait for
      // its answer starts here.
      if (waiting !== null) {
        window.clearTimeout(waitingTimer);
        waitingTimer = window.setTimeout(() => answerLock(false), LOCK_ANSWER_MS);
      }
    };

    // Losing the lock counts as a release, or the button stays held.
    const onPointerLockChange = () => {
      if (document.pointerLockElement) {
        lockGranted.current = true;
        answerLock(true);
      } else {
        stop();
      }
    };

    const onPointerLockError = () => answerLock(false);

    const onContextMenu = (event: Event) => event.preventDefault();

    const onKeyDown = (event: KeyboardEvent) => {
      // The frame loop does the repeating; the key's own would fight it.
      if (event.repeat) return;
      if (isEditorPaused()) return;
      // A dialog that does not pause the world could still take the keyboard.
      const focused = document.activeElement;
      if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) return;

      if (event.code === PICK_KEY) {
        pick.current();
        return;
      }

      const button = KEY_BUTTONS[event.code];
      if (button === undefined) return;
      heldButton.current = button;
      sneaking.current = event.shiftKey;
      act.current(button, true);
      nextActionAt.current = performance.now() + REPEAT_MS;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (KEY_BUTTONS[event.code] === heldButton.current) stop();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.clearTimeout(waitingTimer);
    };
  }, [editable, gl]);

  return (
    <>
      <group ref={groupRef}>
        {layers.map(({ block, shape, variant, positions, axes }) => (
          <BlockLayer
            // One mesh per block, shape and variant, so the key carries all three.
            key={`${block.id}-${shape}-${variant}`}
            block={block}
            shape={shape}
            variant={variant}
            positions={positions}
            axes={axes}
            textures={textures}
          />
        ))}
      </group>

      {editable && (
        <lineSegments ref={highlightRef} visible={false} renderOrder={1}>
          <edgesGeometry args={[new THREE.BoxGeometry(1.002, 1.002, 1.002)]} />
          <lineBasicMaterial color="#000000" depthTest={false} transparent opacity={0.55} />
        </lineSegments>
      )}
    </>
  );
}
