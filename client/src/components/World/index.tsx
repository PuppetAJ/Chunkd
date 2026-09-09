import { use, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import BlockLayer from "./BlockLayer.tsx";
import { getBlock } from "../../lib/voxel/blocks.ts";
import { toKey, type BlockKey } from "../../lib/voxel/coords.ts";
import { buildRenderLayers, groupVisible } from "../../lib/voxel/render.ts";
import {
  axisForFaceNormal,
  facingForYaw,
  slabShapeForPlacement,
  stairsShapeForPlacement,
  verticalExtent,
  SHAPE_SLAB_BOTTOM,
  SHAPE_STAIRS_BOTTOM,
} from "../../lib/voxel/blockValue.ts";
import { loadBlockTextures } from "../../lib/blockTextures.ts";
import { isEditorPaused } from "../../lib/editorUiStore.ts";
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
  const selectedShape = useWorldStore((state) => state.selectedShape);

  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const highlightRef = useRef<THREE.LineSegments>(null);

  // Where the crosshair is pointing. Written every frame and read by the click
  // handler, so it is a ref rather than state: putting it in state would
  // re-render the whole world sixty times a second.
  const target = useRef<Target | null>(null);

  /** Which mouse button is held, and the earliest time it may act again. */
  const heldButton = useRef<number | null>(null);
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
    const raw = providedBlocks ? buildRenderLayers(providedBlocks) : groupVisible(storeVisible);
    return raw.flatMap((layer) => {
      const block = getBlock(layer.blockId);
      return block
        ? [
            {
              block,
              shape: layer.shape,
              facing: layer.facing,
              positions: layer.positions,
              axes: layer.axes,
            },
          ]
        : [];
    });
  }, [providedBlocks, storeVisible]);

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

  const act = useRef<(button: number) => void>(() => {});
  act.current = (button: number) => {
    const current = findTarget();
    if (!current) return;

    if (button === 0) {
      removeBlock(...current.hit);
      return;
    }

    if (button === 2) {
      const [x, y, z] = current.adjacent;
      // Refuse to place a block inside the player, which would trap them.
      if (playerBody && blockOverlapsPlayer(playerBody, x, y, z)) return;
      // The slot decides which shape; the aim decides which half of the cell
      // it fills, and for stairs which way the step faces.
      const chosen = selectedShape();
      let shape = chosen;
      if (chosen === SHAPE_SLAB_BOTTOM) {
        shape = slabShapeForPlacement(current.normalY, current.heightInCell);
      } else if (chosen === SHAPE_STAIRS_BOTTOM) {
        shape = stairsShapeForPlacement(current.normalY, current.heightInCell);
      }

      // Taken from the direction the camera looks rather than camera.rotation,
      // so it does not depend on the rotation order the controls happen to use.
      camera.getWorldDirection(lookDirection);
      const facing = facingForYaw(Math.atan2(-lookDirection.x, -lookDirection.z));

      placeBlock(x, y, z, current.axis, shape, facing);
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
      act.current(heldButton.current);
      nextActionAt.current = now + REPEAT_MS;
    }

    findTarget();
  });

  useEffect(() => {
    if (!editable) return;
    const canvas = gl.domElement;

    // Listening on the canvas covers both mouse buttons. React's onClick only
    // fires for the primary button, which is why placing a block never worked.
    const onPointerDown = (event: PointerEvent) => {
      if (isEditorPaused()) return;
      heldButton.current = event.button;
      // Act now rather than waiting for the next frame. A quick click can send
      // both press and release inside a single frame, and deferring meant such
      // a click did nothing at all.
      act.current(event.button);
      nextActionAt.current = performance.now() + REPEAT_MS;
    };

    const stop = () => {
      heldButton.current = null;
    };

    // Losing the pointer mid-drag, or having the lock taken away, has to count
    // as a release. Otherwise the button stays "held" and keeps repeating.
    const onPointerLockChange = () => {
      if (!document.pointerLockElement) stop();
    };

    const onContextMenu = (event: Event) => event.preventDefault();

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [editable, gl]);

  return (
    <>
      <group ref={groupRef}>
        {layers.map(({ block, shape, facing, positions, axes }) => (
          <BlockLayer
            // One mesh per block, shape and facing, so the key carries all three.
            key={`${block.id}-${shape}-${facing}`}
            block={block}
            shape={shape}
            facing={facing}
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
