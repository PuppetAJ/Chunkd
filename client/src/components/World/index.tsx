import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import BlockLayer from "./BlockLayer.tsx";
import { BLOCKS } from "../../lib/voxel/blocks.ts";
import { type BlockKey } from "../../lib/voxel/coords.ts";
import { buildRenderLayers } from "../../lib/voxel/render.ts";
import { applyBlockTextureSettings } from "../../lib/blockTextures.ts";
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

const TEXTURE_URLS = Object.fromEntries(
  BLOCKS.map((block) => [block.name, block.textureUrl]),
) as Record<string, string>;

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
  } | null>(null);

  /** Which mouse button is held, and when it may next act. */
  const heldButton = useRef<number | null>(null);
  const nextActionAt = useRef(0);
  /** Latest render-loop time, so the pointer handlers can schedule repeats. */
  const clock = useRef(0);

  const textures = useTexture(TEXTURE_URLS);
  applyBlockTextureSettings(...Object.values(textures));

  // Recomputed once per edit rather than once per frame.
  const layers = useMemo(() => {
    return buildRenderLayers(blocks).map((layer) => ({
      block: BLOCKS.find((candidate) => candidate.id === layer.blockId)!,
      positions: layer.positions,
    }));
  }, [blocks]);

  // Nothing in the scene moves except the player, and the player casts no
  // shadow, so the shadow map only needs redrawing when the world changes.
  // Leaving it on automatic redrew every block, twice per frame, forever.
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, blocks]);

  const raycaster = useMemo(() => {
    const instance = new THREE.Raycaster();
    // Range is enforced here rather than by measuring distances afterwards.
    instance.far = REACH;
    return instance;
  }, []);
  const screenCentre = useMemo(() => new THREE.Vector2(0, 0), []);

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
      placeBlock(x, y, z);
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
    // Instances are pure translations, so the face normal is already in world
    // space and points at the neighbouring cell.
    const adjacent: [number, number, number] = [
      block[0] + Math.round(hit.face.normal.x),
      block[1] + Math.round(hit.face.normal.y),
      block[2] + Math.round(hit.face.normal.z),
    ];

    target.current = { hit: block, adjacent };

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
        {layers.map(({ block, positions }) => (
          <BlockLayer
            key={block.id}
            block={block}
            positions={positions}
            texture={textures[block.name] as THREE.Texture}
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
