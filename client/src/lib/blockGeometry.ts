import * as THREE from "three";
import { AXIS_X, AXIS_Z } from "./voxel/blockValue.ts";

/**
 * The unit cube every block is drawn from, with its face shading baked in.
 *
 * Voxel worlds do not light well with a shadow map. Every surface is axis
 * aligned, so a sun at a shallow angle makes flat ground shadow itself in
 * stripes, and the usual cure, biasing the shadow lookup along the surface
 * normal, pushes the sample outside the block and leaks light through the seams
 * instead. Both were visible on the terrain.
 *
 * The games this borrows from do not cast shadows at all. They give each face a
 * fixed brightness according to which way it points, so a cube always reads as a
 * cube: bright on top, darker on the sides, darkest underneath. That is crisp at
 * any distance, costs nothing, has no artefacts to tune away, and lets the whole
 * shadow pass be switched off.
 */
/**
 * The brightnesses are the familiar 1, 0.8, 0.6 and 0.5, raised to 2.2.
 *
 * Vertex colours are multiplied in linear space, but those familiar numbers
 * describe how the result should look after it has been converted back to sRGB
 * for the screen. Applying them directly gives a much flatter cube than
 * intended, because a linear 0.6 displays at around 0.8.
 */
const FACE_BRIGHTNESS = {
  top: 1,
  bottom: 0.22,
  /** North and south, the faces along Z. */
  northSouth: 0.6,
  /** East and west, the faces along X. Darker, so adjacent sides differ. */
  eastWest: 0.32,
};

/** BoxGeometry orders its faces +X, -X, +Y, -Y, +Z, -Z, four vertices each. */
const BRIGHTNESS_BY_FACE = [
  FACE_BRIGHTNESS.eastWest,
  FACE_BRIGHTNESS.eastWest,
  FACE_BRIGHTNESS.top,
  FACE_BRIGHTNESS.bottom,
  FACE_BRIGHTNESS.northSouth,
  FACE_BRIGHTNESS.northSouth,
];

const VERTICES_PER_FACE = 4;

function createBlockGeometry(): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const vertexCount = geometry.attributes["position"]!.count;
  const colors = new Float32Array(vertexCount * 3);

  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const brightness = BRIGHTNESS_BY_FACE[Math.floor(vertex / VERTICES_PER_FACE)] ?? 1;
    colors[vertex * 3] = brightness;
    colors[vertex * 3 + 1] = brightness;
    colors[vertex * 3 + 2] = brightness;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Shared by every block layer; the per-block difference is only the material. */
export const BLOCK_GEOMETRY = createBlockGeometry();

/**
 * Which way a block is turned, as a rotation of the shared cube.
 *
 * A log lying east to west is the same cube stood on its side, so orientation
 * costs nothing beyond the rotation already carried in each instance's matrix.
 */
const UPRIGHT = new THREE.Quaternion();
const LYING_EAST_WEST = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
const LYING_NORTH_SOUTH = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

export function rotationForAxis(axis: number): THREE.Quaternion {
  if (axis === AXIS_X) return LYING_EAST_WEST;
  if (axis === AXIS_Z) return LYING_NORTH_SOUTH;
  return UPRIGHT;
}
