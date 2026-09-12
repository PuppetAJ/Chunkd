/**
 * Critical-path check against a production build, where the
 * Content-Security-Policy applies, Express serves the built bundle, and the
 * editor's test handles are stripped. Fails on any console or page error.
 *
 *   pnpm build
 *   NODE_ENV=production PORT=4000 CLIENT_ORIGIN=http://localhost:4000 pnpm start
 *   pnpm test:prod
 *
 * Check the port is free first: a server left over from an earlier session keeps
 * it and the suite then tests whatever was built days ago. BASE points this at a
 * real deployment.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:4000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "   " + detail}`);
};

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => { if (!/pointer lock/i.test(e.message)) errors.push(e.message); });
page.on("console", (m) => { if (m.type() === "error" && !/pointer lock/i.test(m.text())) errors.push(m.text()); });
page.on("response", async (res) => {
  if (res.status() < 400) return;
  const operation = res.request().postDataJSON?.()?.operationName ?? "";
  let detail = "";
  try { detail = (await res.text()).slice(0, 200); } catch {}
  errors.push(`${res.status()} ${res.url()} ${operation} ${detail}`);
});

const user = `prod${Date.now().toString().slice(-8)}`;

await page.goto(BASE, { waitUntil: "networkidle" });
check(
  "the landing page loads from the production server",
  (await page.getByRole("heading", { name: /Build a world in your browser/ }).count()) > 0,
);
check("no dev-only handles are exposed", await page.evaluate(() => !window.__world && !window.__r3f));

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#username", user);
await page.fill("#email", `${user}@chunkd.test`);
await page.fill("#password", "supersecret1");
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 20000 }).catch(() => {});
check("signup works against the production API", page.url() === `${BASE}/`, page.url());

await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
await page.waitForTimeout(12000);
check("the editor reaches its pause screen", (await page.getByRole("button", { name: "Click to play" }).count()) > 0);
check("the world renders on a canvas", (await page.locator("#editor canvas").count()) > 0);

await page.getByRole("button", { name: "Click to play" }).click();
await page.waitForTimeout(1500);
await page.keyboard.press("p");
await page.waitForTimeout(2000);
check("saving opens the naming dialog", (await page.locator("#buildName").count()) > 0);
await page.fill("#buildName", "Production check");
await page.getByRole("button", { name: "Save build" }).click();
await page.waitForTimeout(3000);

await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
check("the build is saved and listed", (await page.locator("text=Production check").count()) > 0);

await page.getByRole("button", { name: "New post" }).click();
await page.waitForTimeout(900);
await page.fill("#thoughtText", "Posted from a production build.");
if ((await page.locator("#dropdown option").count()) >= 2) await page.selectOption("#dropdown", { index: 1 });
await page.getByRole("button", { name: "Post", exact: true }).click();
await page.waitForTimeout(3000);

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
check("the post appears on the feed", (await page.locator("text=Posted from a production build.").count()) > 0);

await page.locator("article").first().locator("p").first().click({ force: true });
await page.waitForTimeout(8000);
check("the post opens with its build in 3D", (await page.locator("canvas").count()) > 0);

await page.fill('textarea[aria-label="Write a comment"]', "Works in production.");
await page.getByRole("button", { name: "Comment" }).click();
await page.waitForTimeout(2500);
check("commenting works", (await page.locator("text=Works in production.").count()) > 0);

await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log(`\nConsole/page errors (${errors.length}):`);
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  - " + e.slice(0, 180));
}
process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
