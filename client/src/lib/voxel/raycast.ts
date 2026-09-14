import * as THREE from "three";

import { geometryForBlock, rotationForAxis } from "../blockGeometry.ts";
import { blockAxisOf, blockIdOf, blockShapeOf, SHAPE_FULL } from "./blockValue.ts";
import { isPane } from "./connectionShape.ts";
import { toKey, type BlockKey } from "./coords.ts";
import { variantFor } from "./render.ts";

export interface BlockHit {
  /** The block the ray met. */
  cell: [number, number, number];
  /** Where it met it, in world space. */
  point: THREE.Vector3;
  /** That face's outward normal, in world space. */
  normal: THREE.Vector3;
}

/** Reused rather than allocated on every frame. */
const point = new THREE.Vector3();
const normal = new THREE.Vector3();
const shapeMatrix = new THREE.Matrix4();
const shapeCentre = new THREE.Vector3();
const shapeScale = new THREE.Vector3(1, 1, 1);
const shapeHits: THREE.Intersection[] = [];
// Front faces only, like the block materials: standing inside a block should
// not target it from the inside.
const shapeMesh = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial());

/** A block the walk can answer for on its own, without meeting its geometry. */
function isWholeCube(value: number): boolean {
  return blockShapeOf(value) === SHAPE_FULL && !isPane(value);
}

/**
 * Where the ray meets a block that only fills part of its cell. The ray is
 * tested against the same geometry the block is drawn with, so a stair's step
 * and a fence's post are hit where they look.
 */
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
    // The normal comes back in the block's own space, which is the world
    // normal only for a block that is not turned. A log on its side is.
    normal: normal.copy(closest.face.normal).transformDirection(shapeMatrix),
  };
}

/**
 * The first block the ray meets, within `reach`.
 *
 * This walks the ray cell by cell rather than asking three to raycast the
 * scene, because that tests every block in the world on every frame: the cost
 * grows with the size of the build, and it is paid in the middle of the frame.
 * A walk costs the same in an empty world and a finished one.
 */
export function raycastBlocks(
  blocks: Map<BlockKey, number>,
  raycaster: THREE.Raycaster,
  reach: number,
): BlockHit | null {
  const origin = raycaster.ray.origin;
  const direction = raycaster.ray.direction;

  // A block sits at the centre of its cell, so cell x covers x - 0.5 to x + 0.5.
  let x = Math.round(origin.x);
  let y = Math.round(origin.y);
  let z = Math.round(origin.z);

  const stepX = direction.x < 0 ? -1 : 1;
  const stepY = direction.y < 0 ? -1 : 1;
  const stepZ = direction.z < 0 ? -1 : 1;

  // How far along the ray the next crossing of each pair of faces is, and how
  // far apart the ones after that are. A ray parallel to a pair never crosses.
  let tMaxX = direction.x === 0 ? Infinity : (x + stepX * 0.5 - origin.x) / direction.x;
  let tMaxY = direction.y === 0 ? Infinity : (y + stepY * 0.5 - origin.y) / direction.y;
  let tMaxZ = direction.z === 0 ? Infinity : (z + stepZ * 0.5 - origin.z) / direction.z;
  const tDeltaX = Math.abs(1 / direction.x);
  const tDeltaY = Math.abs(1 / direction.y);
  const tDeltaZ = Math.abs(1 / direction.z);

  let distance = 0;
  // The face the ray came in through. All zero in the cell it started in,
  // which has none: a block there surrounds the camera and faces away from it.
  let faceX = 0;
  let faceY = 0;
  let faceZ = 0;

  // The ray crosses at most one boundary per unit of reach on each axis.
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
