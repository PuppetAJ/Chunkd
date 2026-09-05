/**
 * End-to-end smoke test.
 *
 * Drives a real browser through every route and the editor's core interactions.
 * Needs both servers running:
 *
 *   pnpm dev
 *   pnpm test:e2e
 */
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "   " + detail}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const pageErrors = [];
page.on("pageerror", (error) => {
  // Pointer lock cannot be granted to a headless browser. It is not a defect.
  if (!/pointer lock/i.test(error.message)) pageErrors.push(error.message);
});

const stamp = Date.now();
const user = {
  username: `e2e${stamp}`.slice(0, 20),
  email: `e2e${stamp}@chunkd.test`,
  password: "supersecret1",
};

// ---------------------------------------------------------------- public pages
await page.goto(BASE, { waitUntil: "networkidle" });
check("feed renders for signed-out visitors", (await page.locator("text=Explore Recent Builds").count()) > 0);
check("signed-out header offers Login", (await page.getByRole("link", { name: "Login" }).count()) > 0);

await page.goto(`${BASE}/definitely-not-a-page`, { waitUntil: "networkidle" });
check("unknown routes show the 404 page", (await page.locator("text=couldn't find that page").count()) > 0);

await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
check("signed-out /editor redirects to login", page.url().endsWith("/login"), page.url());

// ---------------------------------------------------------------------- signup
await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#username", user.username);
await page.fill("#email", user.email);
await page.fill("#password", user.password);
await page.getByRole("button", { name: "Submit" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
check("signup signs the user in without reloading the page", page.url() === `${BASE}/`);
check("header switches to the signed-in menu", (await page.getByRole("link", { name: "Editor" }).first().count()) > 0);

// ---------------------------------------------------------------------- editor
await page.getByRole("link", { name: "Editor" }).first().click();
await page.waitForURL("**/editor", { timeout: 15000 });
await page.waitForTimeout(9000);

const scene = () =>
  page.evaluate(() => {
    const state = window.__r3f;
    if (!state) return null;
    let drawn = 0;
    let meshes = 0;
    state.scene.traverse((object) => {
      if (object.isInstancedMesh) drawn += object.count;
      else if (object.isMesh) meshes++;
    });
    return {
      // Blocks actually handed to the GPU. Fewer than the world holds, because
      // fully buried blocks are skipped.
      drawn,
      // Blocks in the world. This is what breaking and placing changes.
      blocks: window.__world.getState().blocks.size,
      meshes,
      triangles: state.gl.info.render.triangles,
    };
  });

const hotbarSlots = await page.locator('[aria-label$="slot 1"], [aria-label*="slot "]').count();
check("the hotbar shows every block slot", hotbarSlots === 9, `${hotbarSlots} slots`);

const before = await scene();
check("editor exposes a live scene", before !== null);
check("terrain generated blocks", (before?.blocks ?? 0) > 500, JSON.stringify(before));
check("the scene is actually being drawn", (before?.triangles ?? 0) > 1000, JSON.stringify(before));
check("buried blocks are not drawn", before.drawn < before.blocks, `${before.drawn} drawn of ${before.blocks}`);

// Aim straight down so the block underfoot is inside the player's reach.
await page.evaluate(() => window.__r3f.camera.rotation.set(-Math.PI / 2, 0, 0));
const box = await page.locator("canvas").boundingBox();
const cx = Math.round(box.x + box.width / 2);
const cy = Math.round(box.y + box.height / 2);

await page.mouse.move(cx, cy);
await page.waitForTimeout(600);
await page.mouse.click(cx, cy, { button: "left" });
await page.waitForTimeout(1200);
const afterBreak = await scene();
check("left click breaks a block", afterBreak.blocks === before.blocks - 1,
  `${before.blocks} -> ${afterBreak.blocks}`);

// The world is randomly seeded, so a single fixed camera angle sometimes aims
// somewhere a block cannot legally go: at the sky, or at a cell the player is
// standing in. Sweep a few angles and accept the first that lands one.
let afterPlace = afterBreak;
for (const [pitch, yaw] of [[-0.6, 0], [-0.35, 0], [-0.85, 0], [-0.6, 1.6], [-0.6, 3.1]]) {
  await page.evaluate(([p, y]) => window.__r3f.camera.rotation.set(p, y, 0), [pitch, yaw]);
  await page.waitForTimeout(500);
  await page.mouse.click(cx, cy, { button: "right" });
  await page.waitForTimeout(900);
  afterPlace = await scene();
  if (afterPlace.blocks > afterBreak.blocks) break;
}
check("right click places a block", afterPlace.blocks === afterBreak.blocks + 1,
  `${afterBreak.blocks} -> ${afterPlace.blocks}`);

// P saves the world. The key state is sampled inside the render loop, so a
// press has to last longer than a frame to be seen.
await page.keyboard.press("p");
// The confirmation clears itself after a couple of seconds, so look while it
// is still on screen.
await page.waitForTimeout(1500);
check("the save confirmation appears", (await page.locator("text=/build saved/i").count()) > 0);
await page.waitForTimeout(2000);

// -------------------------------------------------------------------- profile
await page.getByRole("link", { name: "My Profile" }).first().click();
await page.waitForURL("**/profile", { timeout: 15000 });
await page.waitForTimeout(2500);
check("profile page loads", (await page.locator("text=Welcome to Your Profile").count()) > 0);

// --------------------------------------------------------------- posting a build
await page.getByRole("button", { name: /Add Post/i }).click();
await page.waitForTimeout(2000);
check("post dialog opens", (await page.locator('textarea[name="thoughtText"]').count()) > 0);

const buildOptions = await page.locator("#dropdown option").count();
check("the saved build is offered as an attachment", buildOptions >= 2, `${buildOptions} options`);
const formText = await page.locator("form").last().innerText();
check("no stray 0 is rendered next to the build picker", !/(^|\s)0(\s|$)/.test(formText.split("\n")[0] ?? ""));

if (buildOptions >= 2) await page.selectOption("#dropdown", { index: 1 });
await page.fill('textarea[name="thoughtText"]', "End-to-end test build");
await page.getByRole("button", { name: "Post", exact: true }).click();
await page.waitForTimeout(3000);
check("posting closes the dialog", (await page.locator('textarea[name="thoughtText"]').count()) === 0);

// ------------------------------------------------------------------- the feed
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
check("the new post appears on the feed", (await page.locator("text=End-to-end test build").count()) > 0);
check("timestamps are formatted rather than raw ISO",
  !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(await page.content()));

await page.getByRole("link").filter({ hasText: /the discussion/ }).first().click();
await page.waitForTimeout(4000);
check("the post opens on its own page", /\/thought\//.test(page.url()), page.url());
check("the attached build renders in a canvas", (await page.locator("canvas").count()) > 0);

// ------------------------------------------------------------------ commenting
await page.fill("textarea", "Nice work");
await page.getByRole("button", { name: /Submit|Add Reaction|Reply/i }).first().click();
await page.waitForTimeout(2500);
check("a comment can be added", (await page.locator("text=Nice work").count()) > 0);

// ---------------------------------------------------------------------- logout
await page.getByRole("button", { name: "Logout" }).click();
await page.waitForTimeout(1500);
check("logout returns to the signed-out header", (await page.getByRole("link", { name: "Login" }).count()) > 0);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (pageErrors.length) {
  console.log(`\nUncaught page errors (${pageErrors.length}):`);
  for (const message of [...new Set(pageErrors)].slice(0, 10)) console.log("  - " + message.slice(0, 200));
}
process.exit(failed.length === 0 && pageErrors.length === 0 ? 0 : 1);
