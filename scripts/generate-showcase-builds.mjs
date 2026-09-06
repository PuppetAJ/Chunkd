/**
 * Builds the worlds that `pnpm seed` puts in the database.
 *
 * A seeded database used to contain posts and no builds at all, so a fresh
 * install showed a feed with nothing to look at. These are real worlds: each
 * one is generated from a seed, has a structure placed in it, and is saved
 * through the same path a player uses. The thumbnails are captured from the
 * build viewer rather than from inside the game, so they match the studio the
 * site shows a build in.
 *
 * It has to run in a browser because terrain generation, the save format and
 * the thumbnail capture all live in the client. Start the app first:
 *
 *   pnpm dev
 *   node scripts/generate-showcase-builds.mjs
 *
 * The result is written to server/src/seeders/showcaseBuilds.json, which is
 * committed. Re-run this only when the builds or the terrain change.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = new URL("../server/src/seeders/showcaseBuilds.json", import.meta.url);

/**
 * Each entry is one saved world: which terrain to generate, what to put in it,
 * and what the person who "made" it said about it.
 */
const RECIPES = [
  {
    key: "lighthouse",
    seed: 4820,
    name: "Cape Ember Light",
    caption: "Built the lighthouse on the far point. The lantern room took three tries to get round.",
  },
  {
    key: "pyramid",
    seed: 5150,
    name: "Sandstone Steps",
    caption: "Sandstone steps, seventeen across at the base. Worth it for the view from the top.",
  },
  {
    key: "watchtower",
    seed: 9043,
    name: "The Long Watch",
    caption: "A watchtower with a proper battlement. You can see the whole map from up there.",
  },
  {
    key: "causeway",
    seed: 3312,
    name: "Stone Causeway",
    caption: "Ran a causeway across the low ground. Arches underneath so it does not read as a wall.",
  },
  {
    key: "pavilion",
    seed: 7788,
    name: "Cherry Pavilion",
    caption: "Open on all sides, cherry wood throughout. Best thing I have made so far.",
  },
  {
    key: "village",
    seed: 2255,
    name: "Three Roofs",
    caption: "Started with one cabin and could not stop. Paths between them are cobble.",
  },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
// Thumbnails have to be taken in the same scene the site shows a build in.
await context.addInitScript(() =>
  localStorage.setItem(
    "viewer-settings",
    JSON.stringify({ environment: "studio", grid: true, light: "even" }),
  ),
);
const page = await context.newPage();

const user = "showcase" + Date.now().toString().slice(-6);
await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#username", user);
await page.fill("#email", `${user}@chunkd.test`);
await page.fill("#password", "showcase-password");
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 20000 });

// ---------------------------------------------------------------- build them
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Click to play" }).click();
await page.waitForTimeout(600);

const builds = [];

for (const recipe of RECIPES) {
  await page.evaluate((s) => window.__world.getState().newWorld(s), recipe.seed);
  await page.waitForTimeout(4500);
  await page.evaluate(buildInWorld, recipe.key);
  await page.waitForTimeout(2500);

  const data = await page.evaluate(() => window.__world.getState().serialize());

  // Saving it for real is what puts it somewhere the viewer can open it.
  await page.keyboard.press("p");
  await page.waitForTimeout(1200);
  await page.fill("#buildName", recipe.name);
  await page.getByRole("button", { name: "Save build" }).click();
  await page.waitForTimeout(2500);

  builds.push({ name: recipe.name, caption: recipe.caption, format: 2, data, thumbnail: "" });
  console.log(`built ${recipe.key.padEnd(11)} ${(data.length / 1024).toFixed(1)} kB`);
}

// ------------------------------------------------------------- photograph them
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.getByRole("link", { name: "Leave the editor" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

// The chrome belongs to the page, not to the picture.
await page.addStyleTag({ content: "[data-viewer-chrome]{display:none !important}" });

for (const build of builds) {
  const card = page.locator("li").filter({ hasText: build.name }).first();
  await card.getByRole("button", { name: "Open" }).click();
  // Long enough for the world to deserialize and every texture to arrive.
  await page.waitForTimeout(9000);

  // The viewer frames the whole island with room to spare, which leaves the
  // build small in a thumbnail. Zoom in so it fills the picture.
  const canvas = page.locator("[role=dialog] canvas").first();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 4; i += 1) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1200);

  const shot = await canvas.screenshot({ type: "jpeg", quality: 78 });
  build.thumbnail = `data:image/jpeg;base64,${shot.toString("base64")}`;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  console.log(`shot  ${build.name.padEnd(18)} ${(build.thumbnail.length / 1024).toFixed(0)} kB`);
}

await browser.close();
writeFileSync(OUT, JSON.stringify(builds, null, 2) + "\n");
console.log(`\nwrote ${builds.length} builds to ${OUT.pathname}`);

/**
 * Everything below runs inside the page, where the world store lives.
 *
 * Structures are deliberately large. A saved world is the whole 64 by 64 map,
 * so the 3D viewer frames the island rather than the building, and anything
 * cabin-sized disappears at that scale.
 */
function buildInWorld(key) {
  const S = () => window.__world.getState();
  const B = {
    grass: 2, glass: 3, cobblestone: 4, oakLog: 5, oakPlanks: 6, oakLeaves: 7,
    stoneBricks: 9, sand: 10, snow: 15, stone: 18, calcite: 22, deepslate: 23,
    blackstone: 29, mossyCobblestone: 31, sandstone: 32, cutSandstone: 33,
    chiseledSandstone: 34, bricks: 37, cherryLog: 46, cherryPlanks: 47, cherryLeaves: 48,
  };

  const at = (x, y, z) => `${x},${y},${z}`;
  const surface = (x, z) => {
    for (let y = 60; y >= 0; y -= 1) if (S().blocks.has(at(x, y, z))) return y;
    return 0;
  };
  let held = null;
  const use = (id) => { if (held !== id) { S().setHotbarBlock(1, id); S().setSelectedSlot(1); held = id; } };
  const del = (x, y, z) => S().removeBlock(x, y, z);
  // placeBlock refuses an occupied cell, so replacing one means clearing first.
  const put = (x, y, z, id, axis = 0) => { del(x, y, z); use(id); S().placeBlock(x, y, z, axis); };
  const box = (x0, y0, z0, x1, y1, z1, id) => {
    for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) for (let z = z0; z <= z1; z += 1) put(x, y, z, id);
  };
  const clear = (x0, y0, z0, x1, y1, z1) => {
    for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) for (let z = z0; z <= z1; z += 1) del(x, y, z);
  };
  /** Flatten an area to one height, so a structure does not sit half in a hill. */
  const pad = (x0, z0, x1, z1, id = B.grass) => {
    const level = surface(Math.round((x0 + x1) / 2), Math.round((z0 + z1) / 2));
    clear(x0, level + 1, z0, x1, level + 20, z1);
    for (let x = x0; x <= x1; x += 1) for (let z = z0; z <= z1; z += 1)
      for (let y = level; y >= level - 5; y -= 1) put(x, y, z, id);
    return level;
  };
  /** A filled circle, which is what makes a tower read as round. */
  const disc = (cx, cz, r, y, id) => {
    for (let x = cx - r; x <= cx + r; x += 1) for (let z = cz - r; z <= cz + r; z += 1)
      if ((x - cx) ** 2 + (z - cz) ** 2 <= r * r + r * 0.4) put(x, y, z, id);
  };
  const ring = (cx, cz, r, y, id) => {
    for (let x = cx - r; x <= cx + r; x += 1) for (let z = cz - r; z <= cz + r; z += 1) {
      const d = (x - cx) ** 2 + (z - cz) ** 2;
      if (d <= r * r + r * 0.4 && d >= (r - 1) * (r - 1)) put(x, y, z, id);
    }
  };
  /**
   * Take the trees out of a wider area than the pad covers.
   *
   * Levelling only clears the ground the structure stands on, so the trees just
   * outside it were left standing between the camera and the build. Terrain is
   * left alone; only wood and leaves go.
   */
  const TREE_BLOCKS = new Set([5, 7, 40, 42, 43, 45, 46, 48]);
  const clearTrees = (x0, z0, x1, z1, g) => {
    // Widened back toward the player, because the trees that spoil a thumbnail
    // are usually the ones standing near the camera rather than near the build.
    const fromX = Math.min(x0, Math.round(window.__r3f.camera.position.x) - 4);
    const fromZ = Math.min(z0, Math.round(window.__r3f.camera.position.z) - 4);
    for (let x = Math.max(0, fromX); x <= Math.min(63, x1); x += 1)
      for (let z = Math.max(0, fromZ); z <= Math.min(63, z1); z += 1)
        for (let y = Math.max(0, g - 12); y <= g + 26; y += 1) {
          const value = S().blocks.get(at(x, y, z));
          if (value !== undefined && TREE_BLOCKS.has(value & 0xff)) del(x, y, z);
        }
  };

  /** A leafy tree, for filling out the ground around a build. */
  const tree = (x, z, g, log, leaf) => {
    box(x, g + 1, z, x, g + 4, z, log);
    for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1)
      if (Math.abs(dx) + Math.abs(dz) <= 3) { put(x + dx, g + 5, z + dz, leaf); put(x + dx, g + 6, z + dz, leaf); }
  };

  // Put the structure a good way from where the player is standing, so the
  // thumbnail looks at it rather than down onto its roof. Clamped so that
  // nothing runs off the edge of a 64 by 64 map.
  const cam = window.__r3f.camera.position;
  const clamp = (v) => Math.min(46, Math.max(17, Math.round(v)));
  const X = clamp(cam.x + 17);
  const Z = clamp(cam.z + 17);

  if (key === "lighthouse") {
    const g = pad(X - 9, Z - 9, X + 9, Z + 9);
    clearTrees(X - 16, Z - 16, X + 16, Z + 16, g);
    disc(X, Z, 7, g, B.stone);
    disc(X, Z, 6, g + 1, B.cobblestone);
    for (let y = g + 1; y <= g + 20; y += 1) {
      ring(X, Z, 4, y, Math.floor((y - g - 1) / 3) % 2 === 0 ? B.calcite : B.bricks);
    }
    for (let y = g + 21; y <= g + 23; y += 1) ring(X, Z, 5, y, B.glass);
    box(X - 1, g + 21, Z - 1, X + 1, g + 23, Z + 1, B.snow);
    disc(X, Z, 5, g + 24, B.blackstone);
    disc(X, Z, 3, g + 25, B.blackstone);
    return [X, g + 12, Z];
  }

  if (key === "pyramid") {
    const g = pad(X - 11, Z - 11, X + 11, Z + 11, B.sand);
    clearTrees(X - 18, Z - 18, X + 18, Z + 18, g);
    for (let step = 0; step <= 8; step += 1) {
      const r = 8 - step;
      box(X - r, g + 1 + step, Z - r, X + r, g + 1 + step, Z + r,
        step % 2 === 0 ? B.sandstone : B.cutSandstone);
    }
    put(X, g + 10, Z, B.chiseledSandstone);
    // A way in, so it does not read as a solid lump.
    clear(X, g + 1, Z + 6, X, g + 3, Z + 8);
    box(X - 1, g + 1, Z + 9, X + 1, g + 1, Z + 12, B.cutSandstone);
    return [X, g + 5, Z];
  }

  if (key === "watchtower") {
    const g = pad(X - 8, Z - 8, X + 8, Z + 8);
    clearTrees(X - 15, Z - 15, X + 15, Z + 15, g);
    box(X - 5, g + 1, Z - 5, X + 5, g + 1, Z + 5, B.cobblestone);
    for (let y = g + 2; y <= g + 16; y += 1) for (let d = -4; d <= 4; d += 1) {
      put(X + d, y, Z - 4, B.stoneBricks); put(X + d, y, Z + 4, B.stoneBricks);
      put(X - 4, y, Z + d, B.stoneBricks); put(X + 4, y, Z + d, B.stoneBricks);
    }
    for (const y of [g + 6, g + 11]) box(X - 3, y, Z - 3, X + 3, y, Z + 3, B.oakPlanks);
    for (const y of [g + 8, g + 9, g + 13, g + 14]) for (const d of [-1, 0, 1]) {
      put(X + d, y, Z - 4, B.glass); put(X + d, y, Z + 4, B.glass);
      put(X - 4, y, Z + d, B.glass); put(X + 4, y, Z + d, B.glass);
    }
    box(X - 5, g + 17, Z - 5, X + 5, g + 17, Z + 5, B.stoneBricks);
    // Battlements: every other block around the parapet.
    for (let d = -5; d <= 5; d += 2) for (const [x, z] of [[X + d, Z - 5], [X + d, Z + 5], [X - 5, Z + d], [X + 5, Z + d]]) {
      put(x, g + 18, z, B.stoneBricks); put(x, g + 19, z, B.stoneBricks);
    }
    clear(X, g + 2, Z + 4, X, g + 3, Z + 4);
    tree(X - 7, Z + 7, g, B.oakLog, B.oakLeaves);
    return [X, g + 10, Z];
  }

  if (key === "causeway") {
    const g = pad(X - 14, Z - 4, X + 14, Z + 4);
    clearTrees(X - 18, Z - 12, X + 18, Z + 12, g);
    // Piers with gaps between them, so the span reads as arches not a wall.
    for (let x = X - 12; x <= X + 12; x += 6) {
      box(x - 1, g + 1, Z - 2, x + 1, g + 6, Z + 2, B.stone);
      for (const dz of [-2, 2]) { put(x - 2, g + 6, Z + dz, B.stone); put(x + 2, g + 6, Z + dz, B.stone); }
    }
    box(X - 14, g + 7, Z - 3, X + 14, g + 7, Z + 3, B.stoneBricks);
    box(X - 14, g + 8, Z - 2, X + 14, g + 8, Z + 2, B.oakPlanks);
    box(X - 14, g + 8, Z - 3, X + 14, g + 8, Z - 3, B.cobblestone);
    box(X - 14, g + 8, Z + 3, X + 14, g + 8, Z + 3, B.cobblestone);
    for (let x = X - 14; x <= X + 14; x += 4) for (const dz of [-3, 3]) {
      put(x, g + 9, Z + dz, B.oakLog, 0);
      put(x, g + 10, Z + dz, B.snow);
    }
    return [X, g + 9, Z];
  }

  if (key === "pavilion") {
    const g = pad(X - 9, Z - 9, X + 9, Z + 9);
    clearTrees(X - 16, Z - 16, X + 16, Z + 16, g);
    box(X - 7, g + 1, Z - 7, X + 7, g + 1, Z + 7, B.cherryPlanks);
    ring(X, Z, 8, g + 1, B.cobblestone);
    for (const [x, z] of [[X - 6, Z - 6], [X - 6, Z + 6], [X + 6, Z - 6], [X + 6, Z + 6],
                          [X - 6, Z], [X + 6, Z], [X, Z - 6], [X, Z + 6]])
      box(x, g + 2, z, x, g + 7, z, B.cherryLog);
    box(X - 7, g + 8, Z - 7, X + 7, g + 8, Z + 7, B.cherryPlanks);
    box(X - 5, g + 9, Z - 5, X + 5, g + 9, Z + 5, B.cherryPlanks);
    box(X - 3, g + 10, Z - 3, X + 3, g + 10, Z + 3, B.cherryPlanks);
    box(X - 1, g + 11, Z - 1, X + 1, g + 11, Z + 1, B.cherryLeaves);
    for (const [x, z] of [[X - 9, Z - 9], [X + 9, Z + 9], [X - 9, Z + 9], [X + 9, Z - 9]])
      tree(x, z, g, B.cherryLog, B.cherryLeaves);
    return [X, g + 6, Z];
  }

  // village
  const g = pad(X - 13, Z - 13, X + 13, Z + 13);
  clearTrees(X - 19, Z - 19, X + 19, Z + 19, g);
  const cabin = (ox, oz, wall, roof) => {
    box(ox - 4, g + 1, oz - 4, ox + 4, g + 1, oz + 4, B.cobblestone);
    box(ox - 4, g + 2, oz - 4, ox + 4, g + 6, oz + 4, wall);
    clear(ox - 3, g + 2, oz - 3, ox + 3, g + 6, oz + 3);
    for (const [x, z] of [[ox - 4, oz - 4], [ox - 4, oz + 4], [ox + 4, oz - 4], [ox + 4, oz + 4]])
      box(x, g + 2, z, x, g + 6, z, B.oakLog);
    for (const d of [-2, 0, 2]) for (const y of [g + 4, g + 5]) {
      put(ox + d, y, oz - 4, B.glass); put(ox + d, y, oz + 4, B.glass);
      put(ox - 4, y, oz + d, B.glass); put(ox + 4, y, oz + d, B.glass);
    }
    clear(ox, g + 2, oz + 4, ox, g + 3, oz + 4);
    box(ox - 5, g + 7, oz - 5, ox + 5, g + 7, oz + 5, roof);
    box(ox - 4, g + 8, oz - 4, ox + 4, g + 8, oz + 4, roof);
    box(ox - 2, g + 9, oz - 2, ox + 2, g + 9, oz + 2, roof);
  };
  cabin(X - 7, Z - 7, B.oakPlanks, B.bricks);
  cabin(X + 7, Z - 6, B.cherryPlanks, B.deepslate);
  cabin(X - 1, Z + 8, B.oakPlanks, B.mossyCobblestone);
  for (let x = X - 7; x <= X + 7; x += 1) for (const dz of [-1, 0, 1]) put(x, g + 1, Z + dz, B.cobblestone);
  for (let z = Z - 1; z <= Z + 8; z += 1) for (const dx of [-2, -1, 0]) put(X + dx, g + 1, z, B.cobblestone);
  for (const [x, z] of [[X - 12, Z + 2], [X + 12, Z + 6], [X + 2, Z - 12]])
    tree(x, z, g, B.oakLog, B.oakLeaves);
  return [X, g + 6, Z];
}
