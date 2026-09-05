import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import BlockLayer from "./BlockLayer.tsx";
import { BLOCKS } from "../../lib/voxel/blocks.ts";
import { fromKey, toKey, type BlockKey } from "../../lib/voxel/coords.ts";
import { applyBlockTextureSettings } from "../../lib/blockTextures.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import {
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  blockIndex,
  type Body,
} from "../../lib/voxel/collision.ts";

/** How far the player can reach to break or place. */
const REACH = 7;

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

  const textures = useTexture(TEXTURE_URLS);
  applyBlockTextureSettings(...Object.values(textures));

  // Group block positions by type, once per edit rather than once per frame.
  const layers = useMemo(() => {
    const byType = new Map<number, number[]>();
    for (const [key, id] of blocks) {
      const [x, y, z] = fromKey(key);
      // A block with all six neighbours present cannot be seen from anywhere,
      // so there is no reason to hand it to the GPU. On a solid landscape this
      // is most of the world.
      if (
        blocks.has(toKey(x + 1, y, z)) &&
        blocks.has(toKey(x - 1, y, z)) &&
        blocks.has(toKey(x, y + 1, z)) &&
        blocks.has(toKey(x, y - 1, z)) &&
        blocks.has(toKey(x, y, z + 1)) &&
        blocks.has(toKey(x, y, z - 1))
      ) {
        continue;
      }
      let list = byType.get(id);
      if (!list) {
        list = [];
        byType.set(id, list);
      }
      list.push(x, y, z);
    }
    return BLOCKS.filter((block) => byType.has(block.id)).map((block) => ({
      block,
      positions: new Float32Array(byType.get(block.id)!),
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

  useFrame(() => {
    if (!editable || !groupRef.current) return;

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
      const current = target.current;
      if (!current) return;

      if (event.button === 0) {
        removeBlock(...current.hit);
        return;
      }

      if (event.button === 2) {
        const [x, y, z] = current.adjacent;
        // Refuse to place a block inside the player, which would trap them.
        if (playerBody && overlapsPlayer(playerBody, x, y, z)) return;
        placeBlock(x, y, z);
      }
    };

    const onContextMenu = (event: Event) => event.preventDefault();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [editable, gl, placeBlock, removeBlock, playerBody]);

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

function overlapsPlayer(body: Body, x: number, y: number, z: number): boolean {
  return (
    x >= blockIndex(body.x - PLAYER_HALF_WIDTH) &&
    x <= blockIndex(body.x + PLAYER_HALF_WIDTH) &&
    y >= blockIndex(body.y) &&
    y <= blockIndex(body.y + PLAYER_HEIGHT) &&
    z >= blockIndex(body.z - PLAYER_HALF_WIDTH) &&
    z <= blockIndex(body.z + PLAYER_HALF_WIDTH)
  );
}
