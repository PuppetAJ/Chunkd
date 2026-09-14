import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import { geometryForBlock, rotationForAxis } from "../blockGeometry.ts";
import { BLOCK_IDS } from "./blockIds.ts";
import {
  AXIS_Y,
  FACING_NORTH,
  packBlock,
  SHAPE_FENCE,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_WALL,
} from "./blockValue.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { raycastBlocks } from "./raycast.ts";
import { buildRenderLayers } from "./render.ts";
import { generateTerrain } from "./terrain.ts";

const REACH = 7;

/** The same instanced meshes the editor draws, so three can raycast them. */
function sceneFor(blocks: Map<BlockKey, number>): THREE.Object3D[] {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();

  return buildRenderLayers(blocks).map((layer) => {
    const count = layer.positions.length / 3;
    const geometry = geometryForBlock(layer.blockId, layer.shape, layer.variant);
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    for (let i = 0; i < count; i += 1) {
      position.set(layer.positions[i * 3]!, layer.positions[i * 3 + 1]!, layer.positions[i * 3 + 2]!);
      matrix.compose(position, rotationForAxis(layer.axes[i] ?? 0), scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.updateMatrixWorld(true);
    return mesh;
  });
}

/** What three answers for the same ray, in the same terms. */
function raycastScene(
  scene: THREE.Object3D[],
  raycaster: THREE.Raycaster,
): { cell: [number, number, number]; normal: [number, number, number] } | null {
  const hits = raycaster.intersectObjects(scene, false);
  const hit = hits[0];
  const mesh = hit?.object as THREE.InstancedMesh | undefined;
  if (!hit || hit.instanceId === undefined || !hit.face || !mesh?.isInstancedMesh) return null;

  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(hit.instanceId, matrix);
  const centre = new THREE.Vector3().setFromMatrixPosition(matrix);
  const normal = hit.face.normal.clone().transformDirection(matrix);
  return {
    cell: [Math.round(centre.x), Math.round(centre.y), Math.round(centre.z)],
    normal: [Math.round(normal.x), Math.round(normal.y), Math.round(normal.z)],
  };
}

/** Repeatable pseudo-random numbers, so a failure can be reproduced. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function compare(blocks: Map<BlockKey, number>, rays: number, seed: number, size: number): void {
  const scene = sceneFor(blocks);
  const raycaster = new THREE.Raycaster();
  raycaster.far = REACH;
  const next = random(seed);

  for (let i = 0; i < rays; i += 1) {
    const origin = new THREE.Vector3(next() * size, 6 + next() * 12, next() * size);
    const direction = new THREE.Vector3(next() * 2 - 1, next() * 2 - 1, next() * 2 - 1);
    if (direction.lengthSq() === 0) continue;
    // The player never stands inside a block, and a scene raycast cannot see
    // one from the inside: its faces point away.
    const inside = blocks.get(
      toKey(Math.round(origin.x), Math.round(origin.y), Math.round(origin.z)),
    );
    if (inside !== undefined) continue;
    raycaster.ray.set(origin, direction.normalize());

    const expected = raycastScene(scene, raycaster);
    const actual = raycastBlocks(blocks, raycaster, REACH);
    const where = `ray ${i} from ${origin.toArray().join(",")} towards ${direction.toArray().join(",")}`;

    if (!expected) {
      assert.equal(actual, null, `${where}: the walk found a block where the scene found none`);
      continue;
    }
    assert.ok(actual, `${where}: the walk found nothing where the scene hit a block`);
    assert.deepEqual(actual.cell, expected.cell, `${where}: different block`);
    assert.deepEqual(
      [Math.round(actual.normal.x), Math.round(actual.normal.y), Math.round(actual.normal.z)],
      expected.normal,
      `${where}: different face`,
    );
  }
}

test("the walk agrees with a scene raycast over open terrain", () => {
  compare(generateTerrain(4242, 24), 400, 7, 24);
});

test("the walk agrees with a scene raycast over shapes that do not fill their cell", () => {
  const blocks = generateTerrain(9001, 24, { trees: false });
  // A line of each shape at a height the rays pass through.
  let x = 4;
  for (const shape of [SHAPE_SLAB_BOTTOM, SHAPE_STAIRS_BOTTOM, SHAPE_FENCE, SHAPE_WALL]) {
    for (let z = 4; z < 20; z += 1) {
      for (let y = 8; y < 12; y += 1) {
        blocks.set(toKey(x, y, z), packBlock(BLOCK_IDS.oakPlanks, AXIS_Y, shape, FACING_NORTH));
      }
    }
    x += 3;
  }
  for (let z = 4; z < 20; z += 1) {
    for (let y = 8; y < 12; y += 1) {
      blocks.set(toKey(x, y, z), packBlock(BLOCK_IDS.glassPane, AXIS_Y, SHAPE_FULL, FACING_NORTH));
    }
  }
  compare(blocks, 600, 31, 24);
});
