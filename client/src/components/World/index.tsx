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
  /** How far up the face the crosshair is, from -0.5 at its foot to 0.5 at its top. */
  heightInCell: number;
  /** The up component of the face's normal, which says whether it is a top, a bottom or a side. */
  normalY: number;
}

/**
 * Delay between repeats while a mouse button is held.
 *
 * Acting only on the initial press meant building a pillar required clicking
 * inside the third of a second the jump leaves room in. Holding the button
 * repeats, the way it does in the games this borrows from.
 *
 * This is wall-clock time rather than the render clock. It used to be scheduled
 * from whatever time the last frame had recorded, so on a machine dropping
 * frames that timestamp could already be older than the repeat delay, and a
 * single quick click fired an extra action the moment the next frame ran.
 */
const REPEAT_MS = 160;

/**
 * How long after a click is released to wait for the browser to answer the
 * lock request that click made. Chrome answers in a few tens of milliseconds;
 * this only matters when no answer ever comes.
 */
const LOCK_ANSWER_MS = 250;

/**
 * Keys that stand in for the mouse buttons, for anyone on a trackpad where
 * holding right-click to place a run of blocks is awkward. They map onto the
 * same button numbers, so they inherit hold-to-repeat and everything else.
 */
const KEY_BUTTONS: Record<string, number> = {
  KeyC: 0,
  KeyF: 2,
};

interface Props {
  /**
   * Blocks to draw. Defaults to the editor's world; the saved-build viewer
   * passes its own so that opening someone else's build does not replace what
   * you are building.
   */
  blocks?: Map<BlockKey, number>;
  playerBody?: Body;
  editable?: boolean;
}

export default function World({ blocks: providedBlocks, playerBody, editable = false }: Props) {
  const storeBlocks = useWorldStore((state) => state.blocks);
  const storeVisible = useWorldStore((state) => state.visible);
  const blocks = providedBlocks ?? storeBlocks;
  const placeBlock = useWorldStore((state) => state.placeBlock);
  const removeBlock = useWorldStore((state) => state.removeBlock);
  const fillSlab = useWorldStore((state) => state.fillSlab);
  const toggleTrapdoor = useWorldStore((state) => state.toggleTrapdoor);
  const selectedShape = useWorldStore((state) => state.selectedShape);
  const selectedBlockId = useWorldStore((state) => state.selectedBlockId);

  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const highlightRef = useRef<THREE.LineSegments>(null);

  // Where the crosshair is pointing. Written every frame and read by the click
  // handler, so it is a ref rather than state: putting it in state would
  // re-render the whole world sixty times a second.
  const target = useRef<Target | null>(null);

  /** Which mouse button is held, and the earliest time it may act again. */
  const heldButton = useRef<number | null>(null);
  // Shift at the moment of pressing, which decides whether using a trapdoor
  // opens it or builds against it.
  const sneaking = useRef(false);
  // Whether the browser has handed over the mouse at any point. See onPointerDown.
  const lockGranted = useRef(false);
  const nextActionAt = useRef(0);

  // Suspends until every block texture is in. The promise is shared and never
  // rejects, so a missing image costs that one block its texture rather than
  // costing the whole editor its WebGL context.
  const textures = use(loadBlockTextures());

  // Recomputed once per edit rather than once per frame. A layer for a block id
  // the table no longer knows about is dropped rather than crashing, so an old
  // build referring to a removed block still opens.
  // Nothing in the scene moves except the player, who casts no shadow, so the
  // shadow map only needs redrawing when the world itself changes. Left on
  // automatic it redrew every block twice a frame, forever.
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, blocks, storeVisible]);

  const layers = useMemo(() => {
    // The editor's world keeps its own visible set up to date as blocks are
    // placed, so only the grouping is redone here. The build viewer is handed a
    // world it does not own, so that one is worked out in full, once.
    const raw = providedBlocks
      ? buildRenderLayers(providedBlocks)
      : groupVisible(storeVisible, blocks);
    // Development-only handle for the tests. A stair's shape is worked out
    // from its neighbours rather than stored, so this is the only place that
    // knows what was actually drawn.
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
    // Range is enforced here rather than by measuring distances afterwards.
    instance.far = REACH;
    return instance;
  }, []);
  const screenCentre = useMemo(() => new THREE.Vector2(0, 0), []);
  // Scratch values for turning a hit face into a world-space normal, reused
  // rather than allocated every frame.
  const instanceMatrix = useMemo(() => new THREE.Matrix4(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  const blockCentre = useMemo(() => new THREE.Vector3(), []);
  const lookDirection = useMemo(() => new THREE.Vector3(), []);

  // Kept in a ref so the pointer handlers can act without being re-created,
  // and so useFrame can repeat the action while a button is held.
  const clearTarget = () => {
    target.current = null;
    if (highlightRef.current) highlightRef.current.visible = false;
  };

  const act = useRef<(button: number, fresh: boolean) => void>(() => {});
  act.current = (button: number, fresh: boolean) => {
    const current = findTarget();
    if (!current) return;

    // Swing on a hit rather than on the press, so waving the tool at the sky
    // does not animate.
    swingTool();

    if (button === 0) {
      removeBlock(...current.hit);
      return;
    }

    if (button === 2) {
      const chosenShape = selectedShape();
      const targeted = blocks.get(toKey(...current.hit));

      // Using a trapdoor opens or shuts it, as in Minecraft, and sneaking builds
      // against it instead. Only on the press: holding the button would flap it.
      if (targeted !== undefined && isTrapdoor(targeted) && !sneaking.current) {
        if (fresh) toggleTrapdoor(...current.hit);
        return;
      }

      // Two slabs of the same block make a whole one, rather than the second
      // going into the cell next door. Only when the exposed half is the one
      // being built on: from the side, a slab still places its neighbour.
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
      // Refuse to place a block inside the player, which would trap them.
      if (playerBody && blockOverlapsPlayer(playerBody, x, y, z)) return;
      // The slot decides which shape; the aim decides which half of the cell
      // it fills, and for stairs which way the step faces.
      let shape = chosenShape;
      if (chosenShape === SHAPE_SLAB_BOTTOM) {
        shape = slabShapeForPlacement(current.normalY, current.heightInCell);
      } else if (chosenShape === SHAPE_STAIRS_BOTTOM) {
        shape = stairsShapeForPlacement(current.normalY, current.heightInCell);
      }

      // Taken from the direction the camera looks rather than camera.rotation,
      // so it does not depend on the rotation order the controls happen to use.
      camera.getWorldDirection(lookDirection);
      const yaw = Math.atan2(-lookDirection.x, -lookDirection.z);

      if (chosenShape === SHAPE_TRAPDOOR) {
        // A trapdoor hangs from the face it was built against, so the side of
        // that face, rather than the look direction, decides its facing.
        const [hx, , hz] = current.hit;
        const facing = trapdoorFacingForPlacement(x - hx, z - hz, yaw);
        const top = trapdoorTopForPlacement(current.normalY, current.heightInCell);
        placeBlock(x, y, z, current.axis, shape, facing, top);
        return;
      }

      placeBlock(x, y, z, current.axis, shape, facingForYaw(yaw));
    }
  };

  /**
   * Work out what the crosshair is on, right now, and remember it.
   *
   * Both the frame loop and the click handler call this. Clicking used to reuse
   * whatever the last frame had found, which meant a click was only as good as
   * the most recent frame: if that target had since been broken, or the frame
   * loop had not caught up with an edit, the click quietly did nothing at all.
   */
  const findTarget = (): Target | null => {
    if (!groupRef.current) return null;

    // Only the block layers are tested, so the axe in the player's hand and the
    // sky cannot swallow the ray the way scene-wide raycasting did.
    raycaster.setFromCamera(screenCentre, camera);
    const hits = raycaster.intersectObjects(groupRef.current.children, false);
    const hit = hits[0];
    const mesh = hit?.object as THREE.InstancedMesh | undefined;

    if (!hit || hit.instanceId === undefined || !hit.face || !mesh?.isInstancedMesh) {
      // Every way out of here has to forget the previous target. Leaving it in
      // place left the crosshair aimed at a block that had already been broken,
      // so the first click worked and every one after it silently did nothing.
      clearTarget();
      return null;
    }

    // Position and rotation both come from the instance matrix the raycast
    // itself walked. They used to come from two different places, the position
    // from an array hung off the mesh and the rotation from the matrix, and
    // those two could disagree for a frame after an edit, which aimed the
    // crosshair at the wrong block.
    mesh.getMatrixAt(hit.instanceId, instanceMatrix);
    blockCentre.setFromMatrixPosition(instanceMatrix);
    const block: [number, number, number] = [
      Math.round(blockCentre.x),
      Math.round(blockCentre.y),
      Math.round(blockCentre.z),
    ];

    // The face normal comes back in the shared cube's own space. Most instances
    // are pure translations, for which that is already the world normal, but a
    // log lying on its side is a rotated instance and would report the wrong
    // face, so the instance's own rotation is applied.
    normal.copy(hit.face.normal).transformDirection(instanceMatrix);

    const found: Target = {
      hit: block,
      adjacent: [
        block[0] + Math.round(normal.x),
        block[1] + Math.round(normal.y),
        block[2] + Math.round(normal.z),
      ],
      axis: axisForFaceNormal(normal.x, normal.y, normal.z),
      // Instances sit at the centre of their cell whatever the shape.
      heightInCell: hit.point.y - block[1],
      normalY: normal.y,
    };

    target.current = found;
    if (highlightRef.current) {
      // Outline what is actually there, or a slab gets a full cube of wireframe.
      const value = blocks.get(toKey(block[0], block[1], block[2]));
      const [low, high] =
        value === undefined ? [block[1] - 0.5, block[1] + 0.5] : verticalExtent(value, block[1]);
      highlightRef.current.visible = true;
      highlightRef.current.position.set(block[0], (low + high) / 2, block[2]);
      highlightRef.current.scale.set(1, high - low, 1);
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

    // Listening on the canvas covers both mouse buttons. React's onClick only
    // fires for the primary button, which is why placing a block never worked.
    // With the mouse loose, a click on the world may be the one that takes it
    // back, which should do nothing else: coming back to the tab used to break
    // or place a block with that first click. Whether it was is only known when
    // the browser answers the lock request drei makes on the click, so the
    // action waits for that answer. It is dropped if the lock arrives and
    // carried out if the lock is refused or no answer comes. Deciding before
    // the answer, as this first did, left every click doing nothing in a
    // browser that had granted the lock once and then stopped.
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
      sneaking.current = event.shiftKey;
      buttonDown = true;
      // Only once the lock has worked: an automated browser never grants it,
      // and there play goes on without mouse-look and clicks act at once.
      if (!document.pointerLockElement && lockGranted.current) {
        waiting = event.button;
        return;
      }
      heldButton.current = event.button;
      // Act now rather than waiting for the next frame. A quick click can send
      // both press and release inside a single frame, and deferring meant such
      // a click did nothing at all.
      act.current(event.button, true);
      nextActionAt.current = performance.now() + REPEAT_MS;
    };

    const stop = () => {
      buttonDown = false;
      heldButton.current = null;
      // drei asks for the lock on the click that follows this release, so the
      // wait for its answer starts here rather than when the button went down.
      if (waiting !== null) {
        window.clearTimeout(waitingTimer);
        waitingTimer = window.setTimeout(() => answerLock(false), LOCK_ANSWER_MS);
      }
    };

    // Losing the pointer mid-drag, or having the lock taken away, has to count
    // as a release. Otherwise the button stays "held" and keeps repeating.
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
      const button = KEY_BUTTONS[event.code];
      if (button === undefined) return;
      // The frame loop does the repeating, so the key's own auto-repeat would
      // only fight it.
      if (event.repeat) return;
      if (isEditorPaused()) return;
      // A dialog that does not pause the world could still take the keyboard.
      const focused = document.activeElement;
      if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) return;

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
