import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BlockType } from "../../lib/voxel/blocks.ts";
import { applyBlockTextureSettings, type BlockTextures } from "../../lib/blockTextures.ts";
import { geometryForBlock, rotationForAxis } from "../../lib/blockGeometry.ts";
import { SHAPE_TRAPDOOR } from "../../lib/voxel/blockValue.ts";
import type { RenderLayer } from "../../lib/voxel/render.ts";

/** How much light every block gets for free. See the material below. */
const BLACK_FLOOR = 0.005;

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const scale = new THREE.Vector3(1, 1, 1);

/** Round up so the buffer is reallocated rarely rather than on every edit. */
function capacityFor(count: number): number {
  return Math.max(256, 2 ** Math.ceil(Math.log2(count + 1)));
}

interface Props {
  block: BlockType;
  /** Every block of one type, shape and variant: where each is and which way it is turned. */
  layer: RenderLayer;
  textures: BlockTextures;
}

/** Every block of one type, shape and variant, drawn as one instanced mesh. */
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
        // Added rather than multiplied: lifts the darkest pixels, which the
        // filmic curve crushes, and leaves the rest alone.
        emissive: new THREE.Color(BLACK_FLOOR, BLACK_FLOOR, BLACK_FLOOR),
        // The cube's face shading is in its vertex colours.
        vertexColors: true,
        // Back faces only, which needs no depth bias: every block is a closed
        // cube, so a lit face can never be behind its own shadow.
        shadowSide: THREE.BackSide,
        // Cutouts are discarded rather than blended, so there is no draw order to get wrong.
        alphaTest: cutout ? 0.5 : 0,
      });

    if (shape === SHAPE_TRAPDOOR && block.trapdoor) return build(block.trapdoor, true);

    const uniform = block.top === block.side && block.side === block.bottom;
    if (uniform) return build(block.top);

    // In the order blockGeometry.ts groups the faces: sides, top, bottom.
    return [build(block.side), build(block.top), build(block.bottom)];
  }, [block, shape, textures]);

  // react-three-fiber rewrites the colour space of anything assigned as a colour
  // map, so the texture settings are re-asserted once the material holds it.
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
    // Otherwise the mesh keeps its source geometry's bounding sphere, one cube at
    // the origin, and the whole world is culled once the origin leaves the view.
    mesh.computeBoundingSphere();
  }, [positions, axes, count, geometry]);

  return (
    <instancedMesh
      // A new buffer size means a new mesh.
      key={capacity}
      ref={meshRef}
      args={[geometry, undefined, capacity]}
      material={material}
      // Glass would cast a solid black shadow.
      castShadow={block.draw !== "cutout"}
      receiveShadow
    />
  );
}

// An edit reuses the layer objects it did not touch, so memo skips them.
export default memo(BlockLayer);
