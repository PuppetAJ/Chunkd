import { use, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import BlockLayer from "./BlockLayer.tsx";
import { getBlock } from "../../lib/voxel/blocks.ts";
import { toKey, type BlockKey } from "../../lib/voxel/coords.ts";
import { buildRenderLayers } from "../../lib/voxel/render.ts";
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

const REACH = 7;

interface Target {
  hit: [number, number, number];
  adjacent: [number, number, number];
  axis: number;
  normal: [number, number, number];
  heightInCell: number;
  normalY: number;
}

const REPEAT_MS = 160;

const LOCK_ANSWER_MS = 250;

const KEY_BUTTONS: Record<string, number> = {
  KeyC: 0,
  KeyF: 2,
};

const PICK_BUTTON = 1;
const PICK_KEY = "KeyQ";

interface Props {
  blocks?: Map<BlockKey, number>;
  playerBody?: Body;
  editable?: boolean;
}

export default function World({ blocks: providedBlocks, playerBody, editable = false }: Props) {
  const storeBlocks = useWorldStore((state) => state.blocks);
  const storeLayers = useWorldStore((state) => state.layers);
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

  const target = useRef<Target | null>(null);

  const heldButton = useRef<number | null>(null);
  const sneaking = useRef(false);
  const lockGranted = useRef(false);
  const nextActionAt = useRef(0);

  const textures = use(loadBlockTextures());

  const layers = useMemo(() => {
    const raw = providedBlocks ? buildRenderLayers(providedBlocks) : storeLayers;
    if (import.meta.env.DEV && editable) window.__layers = raw;
    return raw.flatMap((layer) => {
      const block = getBlock(layer.blockId);
      return block ? [{ block, layer }] : [];
    });
  }, [providedBlocks, storeLayers, editable]);

  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, layers]);

  const raycaster = useMemo(() => {
    const instance = new THREE.Raycaster();
    instance.far = REACH;
    return instance;
  }, []);
  const screenCentre = useMemo(() => new THREE.Vector2(0, 0), []);
  const lookDirection = useMemo(() => new THREE.Vector3(), []);

  const clearTarget = () => {
    target.current = null;
    if (highlightRef.current) highlightRef.current.visible = false;
  };

  const act = useRef<(button: number, fresh: boolean) => void>(() => {});
  act.current = (button: number, fresh: boolean) => {
    const current = findTarget();
    if (!current) return;

    swingTool();

    if (button === 0) {
      removeBlocks(brushCells(...current.hit, ...current.normal, brush));
      return;
    }

    if (button === 2) {
      const chosenShape = selectedShape();
      const targeted = blocks.get(toKey(...current.hit));

      if (targeted !== undefined && isTrapdoor(targeted) && !sneaking.current) {
        if (fresh) toggleTrapdoor(...current.hit);
        return;
      }

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
      const cells = brushCells(x, y, z, ...current.normal, brush).filter(
        (cell) => !playerBody || !blockOverlapsPlayer(playerBody, ...cell),
      );
      if (cells.length === 0) return;
      let shape = chosenShape;
      if (chosenShape === SHAPE_SLAB_BOTTOM) {
        shape = slabShapeForPlacement(current.normalY, current.heightInCell);
      } else if (chosenShape === SHAPE_STAIRS_BOTTOM) {
        shape = stairsShapeForPlacement(current.normalY, current.heightInCell);
      }

      // From the look direction rather than camera.rotation, whose meaning
      // depends on the rotation order the controls use.
      camera.getWorldDirection(lookDirection);
      const yaw = Math.atan2(-lookDirection.x, -lookDirection.z);

      if (chosenShape === SHAPE_TRAPDOOR) {
        const [hx, , hz] = current.hit;
        const facing = trapdoorFacingForPlacement(x - hx, z - hz, yaw);
        const top = trapdoorTopForPlacement(current.normalY, current.heightInCell);
        placeBlocks(cells, current.axis, shape, facing, top);
        return;
      }

      placeBlocks(cells, current.axis, shape, facingForYaw(yaw));
    }
  };

  const pick = useRef<() => void>(() => {});
  pick.current = () => {
    const current = findTarget();
    if (!current) return;
    const value = blocks.get(toKey(...current.hit));
    if (value !== undefined) pickBlock(blockIdOf(value), blockShapeOf(value));
  };

  const findTarget = (): Target | null => {
    raycaster.setFromCamera(screenCentre, camera);
    const hit = raycastBlocks(blocks, raycaster, REACH);

    if (!hit) {
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
      heightInCell: hit.point.y - block[1],
      normalY: normal.y,
    };

    target.current = found;
    if (highlightRef.current) {
      const wide = Math.abs(normal.x) > 0.5 ? 1 : brush;
      const tall = Math.abs(normal.y) > 0.5 ? 1 : brush;
      const deep = Math.abs(normal.z) > 0.5 ? 1 : brush;

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

    // A click that takes the mouse back should do nothing else, and that is only
    // known once the browser answers drei's lock request, so the action waits.
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
      if (!document.pointerLockElement && lockGranted.current) {
        waiting = event.button;
        return;
      }
      heldButton.current = event.button;
      act.current(event.button, true);
      nextActionAt.current = performance.now() + REPEAT_MS;
    };

    const stop = () => {
      buttonDown = false;
      heldButton.current = null;
      // drei requests the lock on the click after this release, so the wait starts here.
      if (waiting !== null) {
        window.clearTimeout(waitingTimer);
        waitingTimer = window.setTimeout(() => answerLock(false), LOCK_ANSWER_MS);
      }
    };

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
      if (event.repeat) return;
      if (isEditorPaused()) return;
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
        {layers.map(({ block, layer }) => (
          <BlockLayer
            key={`${block.id}-${layer.shape}-${layer.variant}`}
            block={block}
            layer={layer}
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
