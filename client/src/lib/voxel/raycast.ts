import * as THREE from "three";

import { geometryForBlock, rotationForAxis } from "../blockGeometry.ts";
import { blockAxisOf, blockIdOf, blockShapeOf, SHAPE_FULL } from "./blockValue.ts";
import { isPane } from "./connectionShape.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { variantFor } from "./render.ts";

export interface BlockHit {
  cell: [number, number, number];
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

const point = new THREE.Vector3();
const normal = new THREE.Vector3();
const shapeMatrix = new THREE.Matrix4();
const shapeCentre = new THREE.Vector3();
const shapeScale = new THREE.Vector3(1, 1, 1);
const shapeHits: THREE.Intersection[] = [];
const shapeMesh = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial({ side: THREE.FrontSide }));

function isWholeCube(value: number): boolean {
  return blockShapeOf(value) === SHAPE_FULL && !isPane(value);
}

function meetShape(
  blocks: Map<BlockKey, number>,
  raycaster: THREE.Raycaster,
  value: number,
  x: number,
  y: number,
  z: number,
): BlockHit | null {
  shapeMesh.geometry = geometryForBlock(
    blockIdOf(value),
    blockShapeOf(value),
    variantFor(blocks, value, x, y, z),
  );
  shapeMatrix.compose(shapeCentre.set(x, y, z), rotationForAxis(blockAxisOf(value)), shapeScale);
  shapeMesh.matrixWorld.copy(shapeMatrix);

  shapeHits.length = 0;
  shapeMesh.raycast(raycaster, shapeHits);

  let closest: THREE.Intersection | null = null;
  for (const hit of shapeHits) {
    if (!hit.face) continue;
    if (!closest || hit.distance < closest.distance) closest = hit;
  }
  if (!closest?.face) return null;

  return {
    cell: [x, y, z],
    point: point.copy(closest.point),
    // The face normal is in block space; a turned log needs it in world space.
    normal: normal.copy(closest.face.normal).transformDirection(shapeMatrix),
  };
}

export function raycastBlocks(
  blocks: Map<BlockKey, number>,
  raycaster: THREE.Raycaster,
  reach: number,
): BlockHit | null {
  const origin = raycaster.ray.origin;
  const direction = raycaster.ray.direction;

  let x = Math.round(origin.x);
  let y = Math.round(origin.y);
  let z = Math.round(origin.z);

  const stepX = direction.x < 0 ? -1 : 1;
  const stepY = direction.y < 0 ? -1 : 1;
  const stepZ = direction.z < 0 ? -1 : 1;

  let tMaxX = direction.x === 0 ? Infinity : (x + stepX * 0.5 - origin.x) / direction.x;
  let tMaxY = direction.y === 0 ? Infinity : (y + stepY * 0.5 - origin.y) / direction.y;
  let tMaxZ = direction.z === 0 ? Infinity : (z + stepZ * 0.5 - origin.z) / direction.z;
  const tDeltaX = Math.abs(1 / direction.x);
  const tDeltaY = Math.abs(1 / direction.y);
  const tDeltaZ = Math.abs(1 / direction.z);

  let distance = 0;
  let faceX = 0;
  let faceY = 0;
  let faceZ = 0;

  const limit = Math.ceil(reach) * 3 + 3;
  for (let taken = 0; taken <= limit; taken += 1) {
    const value = blocks.get(toKey(x, y, z));
    if (value !== undefined) {
      if (isWholeCube(value)) {
        if (faceX !== 0 || faceY !== 0 || faceZ !== 0) {
          return {
            cell: [x, y, z],
            point: point.copy(origin).addScaledVector(direction, distance),
            normal: normal.set(faceX, faceY, faceZ),
          };
        }
      } else {
        const hit = meetShape(blocks, raycaster, value, x, y, z);
        if (hit) return hit;
      }
    }

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      distance = tMaxX;
      if (distance > reach) return null;
      x += stepX;
      tMaxX += tDeltaX;
      faceX = -stepX;
      faceY = 0;
      faceZ = 0;
    } else if (tMaxY < tMaxZ) {
      distance = tMaxY;
      if (distance > reach) return null;
      y += stepY;
      tMaxY += tDeltaY;
      faceX = 0;
      faceY = -stepY;
      faceZ = 0;
    } else {
      distance = tMaxZ;
      if (distance > reach) return null;
      z += stepZ;
      tMaxZ += tDeltaZ;
      faceX = 0;
      faceY = 0;
      faceZ = -stepZ;
    }
  }

  return null;
}
