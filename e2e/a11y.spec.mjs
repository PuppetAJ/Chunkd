/**
 * Runs axe-core against every page and fails on anything at WCAG 2.1 A or AA.
 * Needs the app running.
 *
 *   pnpm test:a11y
 *
 * The editor is audited on its pause screen: in world it is a locked canvas
 * with no accessibility tree.
 */
import { createRequire } from "node:module";
import { BASE, check, test } from "./lib.mjs";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("every page, signed in and out", async ({ page }) => {
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

    const found = violations.map(
      (violation) =>
        `[${violation.impact}] ${violation.id}: ${violation.help} ` +
        violation.nodes.slice(0, 3).map((html) => html.replace(/\s+/g, " ")).join(" | "),
    );
    check(`${label} (${path}) has no violations`, found.length === 0, found.join("\n"));
  }

  // Sign in first so the signed-in pages get audited too.
  const username = `a11y${Date.now().toString().slice(-8)}`;
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#email", `${username}@chunkd.test`);
  await page.fill("#password", "supersecret1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });

  await audit("feed", "/");
  await audit("profile", "/profile");
  await audit("settings", "/settings");
  await audit("login", "/login");
  await audit("signup", "/signup");
  await audit("not found", "/definitely-not-a-page");
  // The world has to finish generating before the pause screen settles.
  await audit("editor pause screen", "/editor", 9000);

  // The root is a different page when nobody is signed in.
  await page.evaluate(() => localStorage.clear());
  await audit("landing (signed out)", "/", 4000);
});
