import assert from "node:assert/strict";
import test from "node:test";

import { BLOCK_IDS } from "./blockIds.ts";
import {
  AXIS_Y,
  packBlock,
  FACING_EAST,
  FACING_NORTH,
  FACING_SOUTH,
  FACING_WEST,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_SLAB_TOP,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_STAIRS_TOP,
  packTrapdoor,
  SHAPE_FENCE,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
  trapdoorVariant,
} from "./blockValue.ts";
import { fromKey, toKey, type BlockKey } from "./coords.ts";
import {
  buildRenderLayers,
  computeVisible,
  createLayerIndex,
  groupVisible,
  layersFromIndex,
  refreshLayersAround,
  refreshVisibleAround,
} from "./render.ts";
import { straightQuadrants } from "./stairShape.ts";
import { generateTerrain } from "./terrain.ts";

/** A 3x3x3 cube of one block type, centred on the origin. */
function solidCube(id: number): Map<BlockKey, number> {
  const blocks = new Map<BlockKey, number>();
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) blocks.set(toKey(x, y, z), id);
  return blocks;
}

function drawnPositions(blocks: Map<BlockKey, number>): Set<string> {
  const drawn = new Set<string>();
  for (const layer of buildRenderLayers(blocks)) {
    for (let i = 0; i < layer.positions.length; i += 3) {
      drawn.add(`${layer.positions[i]},${layer.positions[i + 1]},${layer.positions[i + 2]}`);
    }
  }
  return drawn;
}

test("a fully buried block is not drawn", () => {
  const drawn = drawnPositions(solidCube(BLOCK_IDS.dirt));
  assert.equal(drawn.has("0,0,0"), false);
  assert.equal(drawn.size, 26);
});

test("a lone block is drawn", () => {
  const blocks = new Map<BlockKey, number>([[toKey(0, 0, 0), BLOCK_IDS.dirt]]);
  assert.deepEqual([...drawnPositions(blocks)], ["0,0,0"]);
});

test("a block behind glass is still drawn", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), BLOCK_IDS.glass);
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("a block behind leaves is still drawn", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), BLOCK_IDS.oakLeaves);
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("glass buried in solid blocks is not drawn", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 0, 0), BLOCK_IDS.glass);
  assert.equal(drawnPositions(blocks).has("0,0,0"), false);
});

test("layers come back sorted by block id", () => {
  const blocks = new Map<BlockKey, number>([
    [toKey(0, 0, 0), BLOCK_IDS.stoneBricks],
    [toKey(2, 0, 0), BLOCK_IDS.dirt],
    [toKey(4, 0, 0), BLOCK_IDS.glass],
  ]);
  const ids = buildRenderLayers(blocks).map((layer) => layer.blockId);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
});

test("updating around a change matches working the whole world out again", () => {
  const blocks = generateTerrain(4242, 24);
  const visible = computeVisible(blocks);

  let state = 12345;
  const random = (limit: number) => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state % limit;
  };

  const placeable = [BLOCK_IDS.stone, BLOCK_IDS.glass, BLOCK_IDS.oakLog, BLOCK_IDS.sand];

  for (let step = 0; step < 400; step += 1) {
    const x = random(24);
    const y = random(20);
    const z = random(24);
    const key = toKey(x, y, z);

    if (blocks.has(key) && random(2) === 0) blocks.delete(key);
    else blocks.set(key, placeable[random(placeable.length)]!);

    refreshVisibleAround(blocks, visible, x, y, z);

    if (step % 40 === 0) {
      const thorough = computeVisible(blocks);
      assert.deepEqual(
        [...visible.keys()].sort(),
        [...thorough.keys()].sort(),
        `visible set drifted at step ${step}`,
      );
    }
  }

  const thorough = computeVisible(blocks);
  assert.deepEqual([...visible.keys()].sort(), [...thorough.keys()].sort());
  assert.deepEqual(
    [...visible.entries()].sort(),
    [...thorough.entries()].sort(),
    "the values must match too, not just which blocks are visible",
  );
});

test("a slab does not hide the block underneath it", () => {
  // Half covered is not covered.
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_TOP));
  const drawn = drawnPositions(blocks);
  assert.equal(drawn.has("0,0,0"), true);
});

test("a slab flush against a face still hides what is behind that face", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM));
  assert.equal(drawnPositions(blocks).has("0,0,0"), false);
});

test("a slab is always drawn, however buried", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM));
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("cubes and slabs of one block are drawn as separate layers", () => {
  // Every instance in a mesh shares one geometry.
  const blocks = new Map<BlockKey, number>([
    [toKey(0, 0, 0), packBlock(BLOCK_IDS.stone)],
    [toKey(2, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM)],
    [toKey(4, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_TOP)],
  ]);

  const layers = buildRenderLayers(blocks);
  assert.equal(layers.length, 3);
  assert.deepEqual(layers.map((layer) => layer.blockId), [BLOCK_IDS.stone, BLOCK_IDS.stone, BLOCK_IDS.stone]);
  assert.deepEqual(layers.map((layer) => layer.shape), [SHAPE_FULL, SHAPE_SLAB_BOTTOM, SHAPE_SLAB_TOP]);
});

test("updating around a slab matches working the whole world out again", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  const visible = computeVisible(blocks);

  blocks.set(toKey(0, 2, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_SLAB_BOTTOM));
  refreshVisibleAround(blocks, visible, 0, 2, 0);

  assert.deepEqual([...visible.keys()].sort(), [...computeVisible(blocks).keys()].sort());
});

test("a stair hides the block its flat half sits on", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH));
  assert.equal(drawnPositions(blocks).has("0,0,0"), false);
});

test("a stair does not hide the block its step half is missing from", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 1, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_TOP, FACING_NORTH));
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("a stair does not hide what is beside it, even where it is solid", () => {
  // Deliberately conservative: a stair's side fill depends on cells two away, which an edit's refresh does not visit.
  for (const facing of [FACING_NORTH, FACING_EAST, FACING_SOUTH, FACING_WEST]) {
    for (const at of [
      [0, 0, -1],
      [0, 0, 1],
      [1, 0, 0],
      [-1, 0, 0],
    ] as [number, number, number][]) {
      const blocks = solidCube(BLOCK_IDS.dirt);
      blocks.set(
        toKey(at[0], at[1], at[2]),
        packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, facing),
      );
      assert.equal(
        drawnPositions(blocks).has("0,0,0"),
        true,
        `a stair at ${at.join(",")} facing ${facing} should not cull the origin`,
      );
    }
  }
});

test("a stair is always drawn, however buried", () => {
  const blocks = solidCube(BLOCK_IDS.dirt);
  blocks.set(toKey(0, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH));
  assert.equal(drawnPositions(blocks).has("0,0,0"), true);
});

test("stairs of one block facing different ways are separate layers", () => {
  // Spaced so none is a neighbour of another and they all stay straight.
  const blocks = new Map<BlockKey, number>([
    [toKey(0, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH)],
    [toKey(4, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_EAST)],
    [toKey(8, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH)],
  ]);

  const layers = buildRenderLayers(blocks);
  assert.equal(layers.length, 2, "two shapes, two meshes");
  const north = layers.find((layer) => layer.variant === straightQuadrants(FACING_NORTH));
  assert.equal(north?.positions.length, 6, "both north stairs in one mesh");
});

test("two stairs meeting at right angles are drawn as corners", () => {
  const straight = new Map<BlockKey, number>([
    [toKey(0, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH)],
  ]);
  const turn = new Map<BlockKey, number>([
    [toKey(0, 0, 0), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_NORTH)],
    [toKey(0, 0, 1), packBlock(BLOCK_IDS.stone, AXIS_Y, SHAPE_STAIRS_BOTTOM, FACING_EAST)],
  ]);

  const alone = buildRenderLayers(straight)[0]?.variant;
  const cornered = buildRenderLayers(turn).find(
    (layer) => layer.positions[0] === 0 && layer.positions[2] === 0,
  )?.variant;

  assert.equal(alone, straightQuadrants(FACING_NORTH));
  assert.notEqual(cornered, alone, "the stair beside a turn should change shape");
});

test("a fence, a wall or a trapdoor never hides the block beside it", () => {
  const shapes: [string, number][] = [
    ["fence", packBlock(BLOCK_IDS.oakPlanks, AXIS_Y, SHAPE_FENCE)],
    ["wall", packBlock(BLOCK_IDS.cobblestone, AXIS_Y, SHAPE_WALL)],
    ["shut trapdoor", packTrapdoor(BLOCK_IDS.oakPlanks, FACING_NORTH, false, false)],
    ["open trapdoor", packTrapdoor(BLOCK_IDS.oakPlanks, FACING_NORTH, false, true)],
  ];
  const sides: [number, number, number][] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (const [name, value] of shapes) {
    for (const [dx, dy, dz] of sides) {
      const blocks = solidCube(BLOCK_IDS.stone);
      blocks.set(toKey(dx, dy, dz), value);
      assert.ok(
        computeVisible(blocks).has(toKey(0, 0, 0)),
        `a ${name} at ${dx},${dy},${dz} hid the block beside it`,
      );
    }
  }
});

test("a fence is drawn by the sides it joins", () => {
  const fence = packBlock(BLOCK_IDS.oakPlanks, AXIS_Y, SHAPE_FENCE);
  const blocks = new Map<BlockKey, number>([
    [toKey(0, 0, 0), fence],
    [toKey(1, 0, 0), fence],
    [toKey(2, 0, 0), fence],
  ]);
  const layers = buildRenderLayers(blocks).filter((layer) => layer.shape === SHAPE_FENCE);
  // East 2 and west 8: the middle one joins both.
  const middle = layers.find((layer) => layer.variant === 10);
  assert.ok(middle, `variants drawn: ${layers.map((layer) => layer.variant).join(",")}`);
  assert.deepEqual([...middle.positions], [1, 0, 0]);
});

test("a trapdoor is drawn by its facing, half and open state", () => {
  const open = packTrapdoor(BLOCK_IDS.oakPlanks, FACING_EAST, true, true);
  const [layer] = buildRenderLayers(new Map([[toKey(0, 0, 0), open]]));
  assert.equal(layer?.shape, SHAPE_TRAPDOOR);
  assert.equal(layer?.variant, trapdoorVariant(open));
});

test("a glass pane never hides the block beside it, and is drawn by what it joins", () => {
  const pane = packBlock(BLOCK_IDS.glassPane);
  const sides: [number, number, number][] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, -1],
  ];
  for (const [dx, dy, dz] of sides) {
    const blocks = solidCube(BLOCK_IDS.stone);
    blocks.set(toKey(dx, dy, dz), pane);
    assert.ok(computeVisible(blocks).has(toKey(0, 0, 0)), `a pane at ${dx},${dy},${dz} hid the block beside it`);
  }

  const row = new Map<BlockKey, number>([
    [toKey(0, 0, 0), pane],
    [toKey(1, 0, 0), pane],
    [toKey(2, 0, 0), pane],
  ]);
  const middle = buildRenderLayers(row).find(
    (layer) => layer.blockId === BLOCK_IDS.glassPane && layer.variant === 10,
  );
  assert.ok(middle, "the middle pane should join east and west");
  assert.deepEqual([...middle.positions], [1, 0, 0]);
});

test("an edit hands back the layers it did not touch", () => {
  const blocks = generateTerrain(4242, 24);
  const visible = computeVisible(blocks);
  const index = createLayerIndex(visible, blocks);
  const first = layersFromIndex(index, blocks);

  let broken: [number, number, number] | null = null;
  for (const key of visible.keys()) {
    const [x, y, z] = fromKey(key);
    if (y > 4 && !visible.has(toKey(x, y + 1, z))) { broken = [x, y, z]; break; }
  }
  assert.ok(broken);
  blocks.delete(toKey(...broken));
  refreshVisibleAround(blocks, visible, ...broken);
  refreshLayersAround(index, visible, blocks, ...broken);

  const second = layersFromIndex(index, blocks);
  const kept = second.filter((layer) => first.includes(layer));
  const fresh = second.filter((layer) => !first.includes(layer));
  assert.ok(fresh.length >= 1, "the layer the block came from is rebuilt");
  assert.ok(fresh.length <= 3, `only the layers around the edit change, not ${fresh.length}`);
  assert.equal(kept.length + fresh.length, second.length);
});

/** A layer's blocks in a fixed order, so two groupings can be compared. */
function summarise(layers: ReturnType<typeof groupVisible>): string[] {
  return layers.map((layer) => {
    const cells: string[] = [];
    for (let i = 0; i < layer.positions.length; i += 3) {
      cells.push(
        `${layer.positions[i]},${layer.positions[i + 1]},${layer.positions[i + 2]}:${layer.axes[i / 3]}`,
      );
    }
    return `${layer.blockId}/${layer.shape}/${layer.variant} ${cells.sort().join(" ")}`;
  });
}

test("edits kept up by the index draw the same as grouping from scratch", () => {
  const blocks = generateTerrain(7, 24);
  const visible = computeVisible(blocks);
  const index = createLayerIndex(visible, blocks);

  const edits: [number, number, number, number | undefined][] = [];
  const stairs = (facing: number) => packBlock(BLOCK_IDS.stoneBricks, AXIS_Y, SHAPE_STAIRS_BOTTOM, facing);
  for (let x = 8; x < 14; x += 1) for (let z = 8; z < 14; z += 1) edits.push([x, 20, z, undefined]);
  for (let x = 8; x < 14; x += 1) edits.push([x, 21, 8, stairs(FACING_EAST)]);
  edits.push([14, 21, 8, stairs(FACING_SOUTH)], [14, 21, 9, stairs(FACING_SOUTH)], [14, 21, 10, stairs(FACING_WEST)]);
  for (let z = 8; z < 14; z += 1) edits.push([7, 21, z, packBlock(BLOCK_IDS.cobblestone, AXIS_Y, SHAPE_WALL)]);
  for (let z = 8; z < 14; z += 1) edits.push([6, 21, z, packBlock(BLOCK_IDS.glassPane)]);
  edits.push([7, 22, 10, packBlock(BLOCK_IDS.cobblestone)]);
  edits.push([9, 22, 8, packTrapdoor(BLOCK_IDS.oakPlanks, FACING_NORTH, false, true)]);
  edits.push([14, 21, 9, undefined], [7, 21, 10, undefined], [10, 21, 8, undefined]);

  for (const [x, y, z, value] of edits) {
    if (value === undefined) blocks.delete(toKey(x, y, z));
    else blocks.set(toKey(x, y, z), value);
    refreshVisibleAround(blocks, visible, x, y, z);
    refreshLayersAround(index, visible, blocks, x, y, z);
  }

  assert.deepEqual(summarise(layersFromIndex(index, blocks)), summarise(buildRenderLayers(blocks)));
});
