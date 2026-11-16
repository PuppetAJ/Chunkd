import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BlockType } from "../../lib/voxel/blocks.ts";
import { applyBlockTextureSettings, type BlockTextures } from "../../lib/blockTextures.ts";
import { geometryForBlock, rotationForAxis } from "../../lib/blockGeometry.ts";
import { SHAPE_TRAPDOOR } from "../../lib/voxel/blockValue.ts";
import type { RenderLayer } from "../../lib/voxel/render.ts";

const BLACK_FLOOR = 0.005;

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const scale = new THREE.Vector3(1, 1, 1);

function capacityFor(count: number): number {
  return Math.max(256, 2 ** Math.ceil(Math.log2(count + 1)));
}

interface Props {
  block: BlockType;
  layer: RenderLayer;
  textures: BlockTextures;
}

function BlockLayer({ block, layer, textures }: Props) {
  const { shape, variant, positions, axes } = layer;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = geometryForBlock(block.id, shape, variant);
  const count = positions.length / 3;
  const capacity = capacityFor(count);

  const material = useMemo(() => {
    const build = (url: string, cutout = block.draw === "cutout") =>
      new THREE.MeshLambertMaterial({
        map: textures.get(url) ?? null,
        emissive: new THREE.Color(BLACK_FLOOR, BLACK_FLOOR, BLACK_FLOOR),
        vertexColors: true,
        shadowSide: THREE.BackSide,
        alphaTest: cutout ? 0.5 : 0,
      });

    if (shape === SHAPE_TRAPDOOR && block.trapdoor) return build(block.trapdoor, true);

    const uniform = block.top === block.side && block.side === block.bottom;
    if (uniform) return build(block.top);

    return [build(block.side), build(block.top), build(block.bottom)];
  }, [block, shape, textures]);

  useLayoutEffect(() => {
    const maps = (Array.isArray(material) ? material : [material])
      .map((one) => one.map)
      .filter((map) => map !== null);
    applyBlockTextureSettings(maps);
  }, [material]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i += 1) {
      position.set(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
      matrix.compose(position, rotationForAxis(axes[i] ?? 0), scale);
      mesh.setMatrixAt(i, matrix);
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [positions, axes, count, geometry]);

  return (
    <instancedMesh
      key={capacity}
      ref={meshRef}
      args={[geometry, undefined, capacity]}
      material={material}
      castShadow={block.draw !== "cutout"}
      receiveShadow
    />
  );
}

export default memo(BlockLayer);
