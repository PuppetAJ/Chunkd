import assert from "node:assert/strict";
import test from "node:test";

import { brushCells, nextBrush, BRUSH_SIZES } from "./brush.ts";

test("the ordinary brush is the one cell being looked at", () => {
  assert.deepEqual(brushCells(4, 5, 6, 0, 1, 0, 1), [[4, 5, 6]]);
});

test("a brush on a floor spreads across the floor", () => {
  const cells = brushCells(0, 10, 0, 0, 1, 0, 3);
  assert.equal(cells.length, 9);
  assert.ok(cells.every(([, y]) => y === 10), "every cell should be in the floor's own layer");
  assert.ok(cells.some(([x, , z]) => x === -1 && z === -1), "should reach the near corner");
  assert.ok(cells.some(([x, , z]) => x === 1 && z === 1), "should reach the far corner");
});

test("a brush on a wall spreads up the wall", () => {
  const facingEast = brushCells(0, 10, 0, 1, 0, 0, 3);
  assert.ok(facingEast.every(([x]) => x === 0), "a wall facing east stays in its own column of x");
  assert.ok(facingEast.some(([, y]) => y === 11), "should reach a block up");

  const facingSouth = brushCells(0, 10, 0, 0, 0, 1, 3);
  assert.ok(facingSouth.every(([, , z]) => z === 0), "a wall facing south stays in its own column of z");
  assert.ok(facingSouth.some(([, y]) => y === 11), "should reach a block up");
});

test("every size is an odd square centred on the cell being looked at", () => {
  for (const size of BRUSH_SIZES) {
    const cells = brushCells(0, 0, 0, 0, 1, 0, size);
    assert.equal(cells.length, size * size, `${size} across`);
    assert.equal(
      cells.filter(([x, , z]) => x === 0 && z === 0).length,
      1,
      `${size} across should cover the middle cell once`,
    );
  }
});

test("the brush steps through the sizes and stops at each end", () => {
  assert.equal(nextBrush(1, 1), 3);
  assert.equal(nextBrush(3, 1), 5);
  assert.equal(nextBrush(9, 1), 9, "the largest brush stays the largest");
  assert.equal(nextBrush(5, -1), 3);
  assert.equal(nextBrush(1, -1), 1, "the smallest brush stays the smallest");
});
