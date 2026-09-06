/**
 * Accessibility audit.
 *
 * Runs axe-core against every page of the site and fails if it finds anything
 * at WCAG 2.1 A or AA. It needs the app running; point it somewhere else with
 * E2E_BASE_URL.
 *
 *   pnpm test:a11y
 *
 * The editor is audited on its pause screen. Its in-world state is a canvas
 * with a pointer lock, which has no accessibility tree to check and which a
 * headless browser cannot enter anyway.
 */
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

let failures = 0;

// Signing in first, so the pages that only exist for a signed-in user are
// audited as well.
const username = `a11y${Date.now().toString().slice(-8)}`;
await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#username", username);
await page.fill("#email", `${username}@chunkd.test`);
await page.fill("#password", "supersecret1");
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 20000 });

async function audit(label, path, settleMs = 1500) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(settleMs);
  await page.addScriptTag({ path: AXE_PATH });

  const violations = await page.evaluate(async (tags) => {
    const results = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.html.slice(0, 140)),
    }));
  }, WCAG);

  if (violations.length === 0) {
    console.log(`  PASS  ${label} (${path})`);
    return;
  }

  failures += violations.length;
  console.log(`  FAIL  ${label} (${path})`);
  for (const violation of violations) {
    console.log(`          [${violation.impact}] ${violation.id}: ${violation.help}`);
    for (const html of violation.nodes.slice(0, 3)) {
      console.log(`            ${html.replace(/\s+/g, " ")}`);
    }
  }
}

await audit("feed", "/");
await audit("profile", "/profile");
await audit("settings", "/settings");
await audit("login", "/login");
await audit("signup", "/signup");
await audit("not found", "/definitely-not-a-page");
// The world has to finish generating before the pause screen settles.
await audit("editor pause screen", "/editor", 9000);

await browser.close();

console.log(`\n${failures === 0 ? "no accessibility violations" : `${failures} violation type(s)`}`);
process.exit(failures === 0 ? 0 : 1);
