import { use, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import BlockLayer from "./BlockLayer.tsx";
import { getBlock } from "../../lib/voxel/blocks.ts";
import { type BlockKey } from "../../lib/voxel/coords.ts";
import { buildRenderLayers } from "../../lib/voxel/render.ts";
import { axisForFaceNormal } from "../../lib/voxel/blockValue.ts";
import { loadBlockTextures } from "../../lib/blockTextures.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { blockOverlapsPlayer, type Body } from "../../lib/voxel/collision.ts";

/** How far the player can reach to break or place. */
const REACH = 7;

/**
 * Delay between repeats while a mouse button is held.
 *
 * Acting only on the initial press meant building a pillar required clicking
 * inside the third of a second the jump leaves room in. Holding the button
 * repeats, the way it does in the games this borrows from.
 */
const REPEAT_SECONDS = 0.16;

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
  const blocks = providedBlocks ?? storeBlocks;
  const placeBlock = useWorldStore((state) => state.placeBlock);
  const removeBlock = useWorldStore((state) => state.removeBlock);

  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const highlightRef = useRef<THREE.LineSegments>(null);

  // Where the crosshair is pointing. Written every frame and read by the click
  // handler, so it is a ref rather than state: putting it in state would
  // re-render the whole world sixty times a second.
  const target = useRef<{
    hit: [number, number, number];
    adjacent: [number, number, number];
    /** Which way a block with a grain should lie if placed here. */
    axis: number;
  } | null>(null);

  /** Which mouse button is held, and when it may next act. */
  const heldButton = useRef<number | null>(null);
  const nextActionAt = useRef(0);
  /** Latest render-loop time, so the pointer handlers can schedule repeats. */
  const clock = useRef(0);

  // Suspends until every block texture is in. The promise is shared and never
  // rejects, so a missing image costs that one block its texture rather than
  // costing the whole editor its WebGL context.
  const textures = use(loadBlockTextures());

  // Recomputed once per edit rather than once per frame. A layer for a block id
  // the table no longer knows about is dropped rather than crashing, so an old
  // build referring to a removed block still opens.
  const layers = useMemo(() => {
    return buildRenderLayers(blocks).flatMap((layer) => {
      const block = getBlock(layer.blockId);
      return block ? [{ block, positions: layer.positions, axes: layer.axes }] : [];
    });
  }, [blocks]);

  // Nothing in the scene moves except the player, and the player casts no
  // shadow, so the shadow map only needs redrawing when the world changes.
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

  // Kept in a ref so the pointer handlers can act without being re-created,
  // and so useFrame can repeat the action while a button is held.
  const act = useRef<(button: number) => void>(() => {});
  act.current = (button: number) => {
    const current = target.current;
    if (!current) return;

    if (button === 0) {
      removeBlock(...current.hit);
      return;
    }

    if (button === 2) {
      const [x, y, z] = current.adjacent;
      // Refuse to place a block inside the player, which would trap them.
      if (playerBody && blockOverlapsPlayer(playerBody, x, y, z)) return;
      placeBlock(x, y, z, current.axis);
    }
  };

  useFrame((state) => {
    if (!editable || !groupRef.current) return;
    clock.current = state.clock.elapsedTime;

    if (heldButton.current !== null && clock.current >= nextActionAt.current) {
      act.current(heldButton.current);
      nextActionAt.current = clock.current + REPEAT_SECONDS;
    }

    // Only the block layers are tested, so the axe in the player's hand and the
    // sky cannot swallow the ray the way scene-wide raycasting did.
    raycaster.setFromCamera(screenCentre, camera);
    const hits = raycaster.intersectObjects(groupRef.current.children, false);
    const hit = hits[0];

    if (!hit || hit.instanceId === undefined || !hit.face) {
      target.current = null;
      if (highlightRef.current) highlightRef.current.visible = false;
      return;
    }

    const positions = hit.object.userData["positions"] as Float32Array | undefined;
    if (!positions) return;

    const i = hit.instanceId;
    const block: [number, number, number] = [
      positions[i * 3]!,
      positions[i * 3 + 1]!,
      positions[i * 3 + 2]!,
    ];
    // The face normal comes back in the shared cube's own space. Most instances
    // are pure translations, for which that is already the world normal, but a
    // log lying on its side is a rotated instance and would report the wrong
    // face, so the instance's own rotation is applied.
    (hit.object as THREE.InstancedMesh).getMatrixAt(i, instanceMatrix);
    normal.copy(hit.face.normal).transformDirection(instanceMatrix);

    const adjacent: [number, number, number] = [
      block[0] + Math.round(normal.x),
      block[1] + Math.round(normal.y),
      block[2] + Math.round(normal.z),
    ];

    target.current = {
      hit: block,
      adjacent,
      axis: axisForFaceNormal(normal.x, normal.y, normal.z),
    };

    if (highlightRef.current) {
      highlightRef.current.visible = true;
      highlightRef.current.position.set(block[0], block[1], block[2]);
    }
  });

  useEffect(() => {
    if (!editable) return;
    const canvas = gl.domElement;

    // Listening on the canvas covers both mouse buttons. React's onClick only
    // fires for the primary button, which is why placing a block never worked.
    const onPointerDown = (event: PointerEvent) => {
      heldButton.current = event.button;
      // Act now rather than waiting for the next frame. A quick click can send
      // both press and release inside a single frame, and deferring meant such
      // a click did nothing at all.
      act.current(event.button);
      nextActionAt.current = clock.current + REPEAT_SECONDS;
    };

    const stop = () => {
      heldButton.current = null;
    };

    const onContextMenu = (event: Event) => event.preventDefault();

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", stop);
    window.addEventListener("blur", stop);
    canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("blur", stop);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [editable, gl]);

  return (
    <>
      <group ref={groupRef}>
        {layers.map(({ block, positions, axes }) => (
          <BlockLayer
            key={block.id}
            block={block}
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
