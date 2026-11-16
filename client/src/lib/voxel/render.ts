import { SEE_THROUGH_BLOCK_IDS } from "./blockIds.ts";
import {
  blockAxisOf,
  blockIdOf,
  blockShapeOf,
  SHAPE_FENCE,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
  trapdoorVariant,
} from "./blockValue.ts";
import { connectionMask, isPane, WALL_POST_BIT, wallHasPost } from "./connectionShape.ts";
import { stairQuadrants } from "./stairShape.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";

export interface RenderLayer {
  blockId: number;
  shape: number;
  variant: number;
  positions: Float32Array;
  axes: Uint8Array;
}

export type VisibleBlocks = Map<BlockKey, number>;

function coversFace(
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
  dy: number,
): boolean {
  const value = blocks.get(toKey(x, y, z));
  if (value === undefined) return false;
  if (SEE_THROUGH_BLOCK_IDS.has(blockIdOf(value))) return false;

  const shape = blockShapeOf(value);
  if (shape === SHAPE_FULL) return true;
  if (shape === SHAPE_SLAB_BOTTOM) return dy === 1;
  if (shape === SHAPE_SLAB_TOP) return dy === -1;

  if (shape === SHAPE_STAIRS_BOTTOM) return dy === 1;
  if (shape === SHAPE_STAIRS_TOP) return dy === -1;

  if (shape === SHAPE_FENCE || shape === SHAPE_WALL || shape === SHAPE_TRAPDOOR) return false;

  return true;
}

function isHidden(blocks: Map<BlockKey, number>, x: number, y: number, z: number): boolean {
  const self = blocks.get(toKey(x, y, z));
  if (self !== undefined && blockShapeOf(self) !== SHAPE_FULL) return false;

  return (
    coversFace(blocks, x + 1, y, z, 0) &&
    coversFace(blocks, x - 1, y, z, 0) &&
    coversFace(blocks, x, y + 1, z, 1) &&
    coversFace(blocks, x, y - 1, z, -1) &&
    coversFace(blocks, x, y, z + 1, 0) &&
    coversFace(blocks, x, y, z - 1, 0)
  );
}

export function computeVisible(blocks: Map<BlockKey, number>): VisibleBlocks {
  const visible: VisibleBlocks = new Map();
  for (const [key, value] of blocks) {
    const [x, y, z] = fromKey(key);
    if (!isHidden(blocks, x, y, z)) visible.set(key, value);
  }
  return visible;
}

export function refreshVisibleAround(
  blocks: Map<BlockKey, number>,
  visible: VisibleBlocks,
  x: number,
  y: number,
  z: number,
): void {
  const cells: [number, number, number][] = [
    [x, y, z],
    [x + 1, y, z],
    [x - 1, y, z],
    [x, y + 1, z],
    [x, y - 1, z],
    [x, y, z + 1],
    [x, y, z - 1],
  ];

  for (const [cx, cy, cz] of cells) {
    const key = toKey(cx, cy, cz);
    const value = blocks.get(key);
    if (value === undefined || isHidden(blocks, cx, cy, cz)) visible.delete(key);
    else visible.set(key, value);
  }
}

const SHAPE_SLOTS = 8;
const VARIANT_SLOTS = 32;

export function variantFor(
  blocks: Map<BlockKey, number>,
  value: number,
  x: number,
  y: number,
  z: number,
): number {
  if (isPane(value)) return connectionMask(blocks, x, y, z);
  const shape = blockShapeOf(value);
  if (shape === SHAPE_STAIRS_BOTTOM || shape === SHAPE_STAIRS_TOP) {
    return stairQuadrants(blocks, x, y, z);
  }
  if (shape === SHAPE_FENCE) return connectionMask(blocks, x, y, z);
  if (shape === SHAPE_WALL) {
    const mask = connectionMask(blocks, x, y, z);
    return mask | (wallHasPost(blocks, x, y, z, mask) ? WALL_POST_BIT : 0);
  }
  if (shape === SHAPE_TRAPDOOR) return trapdoorVariant(value);
  return 0;
}

function layerTypeFor(blocks: Map<BlockKey, number>, value: number, x: number, y: number, z: number): number {
  const variant = variantFor(blocks, value, x, y, z);
  return (blockIdOf(value) * SHAPE_SLOTS + blockShapeOf(value)) * VARIANT_SLOTS + variant;
}

function layerFor(type: number, keys: Iterable<BlockKey>, blocks: Map<BlockKey, number>): RenderLayer {
  const positions: number[] = [];
  const axes: number[] = [];
  for (const key of keys) {
    const [x, y, z] = fromKey(key);
    positions.push(x, y, z);
    axes.push(blockAxisOf(blocks.get(key) ?? 0));
  }
  return {
    blockId: Math.floor(type / (SHAPE_SLOTS * VARIANT_SLOTS)),
    shape: Math.floor(type / VARIANT_SLOTS) % SHAPE_SLOTS,
    variant: type % VARIANT_SLOTS,
    positions: new Float32Array(positions),
    axes: Uint8Array.from(axes),
  };
}

export interface LayerIndex {
  typeByKey: Map<BlockKey, number>;
  keysByType: Map<number, Set<BlockKey>>;
  layerByType: Map<number, RenderLayer>;
}

export function createLayerIndex(visible: VisibleBlocks, blocks: Map<BlockKey, number> = visible): LayerIndex {
  const index: LayerIndex = { typeByKey: new Map(), keysByType: new Map(), layerByType: new Map() };
  for (const [key, value] of visible) {
    const [x, y, z] = fromKey(key);
    addToIndex(index, key, layerTypeFor(blocks, value, x, y, z));
  }
  return index;
}

function addToIndex(index: LayerIndex, key: BlockKey, type: number): void {
  index.typeByKey.set(key, type);
  let keys = index.keysByType.get(type);
  if (!keys) {
    keys = new Set();
    index.keysByType.set(type, keys);
  }
  keys.add(key);
  index.layerByType.delete(type);
}

function removeFromIndex(index: LayerIndex, key: BlockKey, type: number): void {
  index.typeByKey.delete(key);
  const keys = index.keysByType.get(type);
  if (!keys) return;
  keys.delete(key);
  if (keys.size === 0) index.keysByType.delete(type);
  index.layerByType.delete(type);
}

export function refreshLayersAround(
  index: LayerIndex,
  visible: VisibleBlocks,
  blocks: Map<BlockKey, number>,
  x: number,
  y: number,
  z: number,
): void {
  const cells: [number, number, number][] = [
    [x, y, z],
    [x + 1, y, z],
    [x - 1, y, z],
    [x, y + 1, z],
    [x, y - 1, z],
    [x, y, z + 1],
    [x, y, z - 1],
  ];

  const centre = toKey(x, y, z);
  for (const [cx, cy, cz] of cells) {
    const key = toKey(cx, cy, cz);
    const value = visible.get(key);
    const was = index.typeByKey.get(key);
    const now = value === undefined ? undefined : layerTypeFor(blocks, value, cx, cy, cz);
    if (was === now && key !== centre) continue;
    if (was !== undefined) removeFromIndex(index, key, was);
    if (now !== undefined) addToIndex(index, key, now);
  }
}

export function layersFromIndex(index: LayerIndex, blocks: Map<BlockKey, number>): RenderLayer[] {
  return [...index.keysByType.keys()]
    .sort((a, b) => a - b)
    .map((type) => {
      let layer = index.layerByType.get(type);
      if (!layer) {
        layer = layerFor(type, index.keysByType.get(type)!, blocks);
        index.layerByType.set(type, layer);
      }
      return layer;
    });
}

export function groupVisible(visible: VisibleBlocks, blocks: Map<BlockKey, number> = visible): RenderLayer[] {
  return layersFromIndex(createLayerIndex(visible, blocks), blocks);
}

export function buildRenderLayers(blocks: Map<BlockKey, number>): RenderLayer[] {
  return groupVisible(computeVisible(blocks), blocks);
}
