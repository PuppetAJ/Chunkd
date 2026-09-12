import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BlockType } from "../../lib/voxel/blocks.ts";
import { applyBlockTextureSettings, type BlockTextures } from "../../lib/blockTextures.ts";
import { geometryForBlock, rotationForAxis } from "../../lib/blockGeometry.ts";
import { SHAPE_TRAPDOOR } from "../../lib/voxel/blockValue.ts";

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
  /** Every instance shares a geometry, so shape and variant belong to the layer. */
  shape: number;
  variant: number;
  /** Flat x, y, z triples for every block of this type. */
  positions: Float32Array;
  /** Which way each of those blocks is turned. */
  axes: Uint8Array;
  textures: BlockTextures;
}

/**
 * Every block of one type, drawn in as few calls as the block allows: positions
 * go straight into an instance buffer. A block whose six faces share one texture
 * is a single draw call, and grass, logs and hay get one material per face group.
 */
export default function BlockLayer({ block, shape, variant, positions, axes, textures }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = geometryForBlock(block.id, shape, variant);
  const count = positions.length / 3;
  const capacity = capacityFor(count);

  const material = useMemo(() => {
    const build = (url: string, cutout = block.draw === "cutout") =>
      new THREE.MeshLambertMaterial({
        map: textures.get(url) ?? null,
        // Added rather than multiplied, so it lifts the darkest pixels and
        // leaves the rest alone: the filmic curve is steep at the bottom and
        // a spruce log's grain falls off the end of it. Raising it costs
        // colour, since the light it adds is white.
        emissive: new THREE.Color(BLACK_FLOOR, BLACK_FLOOR, BLACK_FLOOR),
        // The cube carries its face shading in its vertex colours, which this
        // multiplies into the texture. The sun adds cast shadows on top.
        vertexColors: true,
        // Back faces only, which removes the need for a depth bias: every block
        // is a closed cube, so the recorded depth is its far side and a lit face
        // can never be behind its own shadow.
        shadowSide: THREE.BackSide,
        // Glass is a frame around a hole. Discarding the hole outright, rather
        // than blending it, keeps the frame at full strength and leaves no draw
        // order to get wrong.
        alphaTest: cutout ? 0.5 : 0,
      });

    // A trapdoor has its own drawing, holes and all, rather than the block's.
    if (shape === SHAPE_TRAPDOOR && block.trapdoor) return build(block.trapdoor, true);

    const uniform = block.top === block.side && block.side === block.bottom;
    if (uniform) return build(block.top);

    const top = build(block.top);
    const side = build(block.side);
    const bottom = build(block.bottom);
    // BoxGeometry's face order: +X, -X, +Y, -Y, +Z, -Z.
    return [side, side, top, bottom, side, side];
  }, [block, shape, textures]);

  // Nearest filtering and the sRGB tag are set when the texture loads, but
  // react-three-fiber rewrites the colour space of anything it assigns to a
  // colour map, so they are re-asserted here, once the material holds the map.
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
    // An InstancedMesh otherwise keeps the bounding sphere of its source
    // geometry, a single cube at the origin, and the renderer culls the entire
    // world as soon as the origin leaves the view.
    mesh.computeBoundingSphere();
  }, [positions, axes, count, geometry]);

  return (
    <instancedMesh
      // Changing the buffer size means a new mesh, so key on the capacity
      // rather than the exact count.
      key={capacity}
      ref={meshRef}
      args={[geometry, undefined, capacity]}
      material={material}
      // Glass lets nearly all the light through, so casting from it would draw a
      // solid black block on the ground.
      castShadow={block.draw !== "cutout"}
      receiveShadow
    />
  );
}
