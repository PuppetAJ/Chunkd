import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { BlockType } from "../../lib/voxel/blocks.ts";

const matrix = new THREE.Matrix4();

/** Round up so the buffer is reallocated rarely rather than on every edit. */
function capacityFor(count: number): number {
  return Math.max(256, 2 ** Math.ceil(Math.log2(count + 1)));
}

interface Props {
  block: BlockType;
  /** Flat x, y, z triples for every block of this type. */
  positions: Float32Array;
  texture: THREE.Texture;
}

/**
 * Every block of one type, drawn in a single call.
 *
 * The previous version mounted a React component per block, twice over: one for
 * the mesh and one for its collider. Placing a block re-rendered all of them.
 * Here the block positions are written straight into an instance buffer, so the
 * whole world is one draw call per block type no matter how many blocks there
 * are.
 */
export default function BlockLayer({ block, positions, texture }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = positions.length / 3;
  const capacity = capacityFor(count);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i += 1) {
      matrix.setPosition(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
      mesh.setMatrixAt(i, matrix);
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    // An InstancedMesh otherwise keeps the bounding sphere of its source
    // geometry, a single cube at the origin, and the renderer culls the entire
    // world as soon as the origin leaves the view.
    mesh.computeBoundingSphere();

    // The instance buffer is reused across renders, so tell three about the
    // positions this mesh actually holds for hit testing.
    mesh.userData["positions"] = positions;
  }, [positions, count]);

  return (
    <instancedMesh
      // Changing the buffer size means a new mesh, so key on the capacity
      // rather than the exact count.
      key={capacity}
      ref={meshRef}
      args={[undefined, undefined, capacity]}
      castShadow={block.castsShadow}
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial
        map={texture}
        color={block.tint}
        transparent={block.draw === "blend"}
        opacity={block.draw === "blend" ? 0.85 : 1}
        // Glass is a frame around a hole. Discarding the hole outright, rather
        // than blending it, keeps the frame at full strength instead of washing
        // it out against whatever happens to be behind it.
        alphaTest={block.draw === "cutout" ? 0.5 : 0}
      />
    </instancedMesh>
  );
}
