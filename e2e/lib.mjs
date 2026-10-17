/** Shared setup for the end-to-end suites and throwaway scripts. */
import { expect, test as base } from "@playwright/test";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Playwright Test's `test`, with the page every suite expects: long timeouts, the pointer lock refused, and its
 * uncaught errors failing the test.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // The first action after a page with a 3D viewer loads can block for around
    // ten seconds locally, and longer on a loaded CI runner, which overran the
    // 30 second default and failed runs that were not actually broken.
    page.setDefaultTimeout(60_000);
    page.setDefaultNavigationTimeout(60_000);

    // The suite is written for a browser that refuses the pointer lock, which is
    // what a headless one does on a Mac. On Linux it grants it, and then every
    // synthetic mouse event turns the camera. So the harness refuses it
    // everywhere and records who asked; the locked case has its own section.
    await page.addInitScript(() => {
      window.__lockRequests = [];
      Element.prototype.requestPointerLock = function () {
        window.__lockRequests.push(new Error().stack?.includes("drei") ? "drei" : "editor");
        setTimeout(() => document.dispatchEvent(new Event("pointerlockerror")));
        return undefined;
      };
    });

    const pageErrors = [];
    page.on("pageerror", (error) => {
      if (!/pointer lock/i.test(error.message)) pageErrors.push(error.message);
    });

    await use(page);
    expect(pageErrors, "no uncaught errors on the page").toEqual([]);
  },
});

export { expect };

// The time since the previous check, so each figure covers the work between them; E2E_TIMING=1 lists the slowest.
const timings = [];
let lastCheckAt = Date.now();

/** One check among many: a failure is recorded and the test carries on, so a run shows every failure, not the first. */
export function check(name, ok, detail = "") {
  const now = Date.now();
  timings.push({ name, ms: now - lastCheckAt });
  lastCheckAt = now;
  expect.soft(ok, detail ? `${name}   (${String(detail).slice(0, 300)})` : name).toBeTruthy();
}

test.afterAll(() => {
  if (!process.env.E2E_TIMING || !timings.length) return;
  const slowest = [...timings].sort((a, b) => b.ms - a.ms).slice(0, 20);
  const total = timings.reduce((sum, timing) => sum + timing.ms, 0);
  console.log(`\nSlowest steps (${(total / 1000).toFixed(0)}s measured in total):`);
  for (const timing of slowest) console.log(`  ${(timing.ms / 1000).toFixed(1)}s  ${timing.name}`);
});

/** Waits that never throw on a timeout: the check that follows is what fails. */
export function helpers(page) {
  const until = async (probe, arg = null, timeout = 15000) => {
    try {
      await page.waitForFunction(probe, arg, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };

  /** For state sampled per frame, and for when the expected outcome is that nothing happens. */
  const frames = (count = 2) =>
    page.evaluate(
      (n) =>
        new Promise((resolve) => {
          let left = n;
          const step = () => {
            left -= 1;
            if (left <= 0) resolve();
            else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
      count,
    );

  const appears = (locator, timeout = 15000) =>
    locator.first().waitFor({ state: "visible", timeout }).catch(() => {});

  const goes = (locator, timeout = 15000) =>
    locator.first().waitFor({ state: "detached", timeout }).catch(() => {});

  /** Poll here rather than in the page, for things only this script can see. */
  const waitFor = async (predicate, timeout = 15000, interval = 100) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await predicate()) return true;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return false;
  };

  const rendererSettled = () =>
    until(() => {
      const world = window.__world?.getState();
      const state = window.__r3f;
      if (!world || !state) return false;
      let drawn = 0;
      state.scene.traverse((object) => {
        if (object.isInstancedMesh) drawn += object.count;
      });
      return world.blocks.size > 500 && drawn === world.visible.size;
    });

  const blockCount = () => page.evaluate(() => window.__world.getState().blocks.size);

  return { until, frames, appears, goes, waitFor, rendererSettled, blockCount };
}

/** The stamp keeps concurrent runs from colliding. */
export function newUser() {
  const stamp = Date.now();
  return {
    username: `e2e${stamp}`.slice(0, 20),
    email: `e2e${stamp}@chunkd.test`,
    password: "supersecret1",
  };
}

export async function signUp(page, user) {
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", user.username);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });
  return user;
}

export async function signInAsDemo(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /demo/i }).first().click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });
}

/** Pass a seed to pin the world: a fresh editor seeds itself at random. */
export async function openEditor(page, wait, seed) {
  await page.goto(`${BASE}/editor`, { waitUntil: "domcontentloaded" });
  const ready = await wait.rendererSettled();

  await page.getByRole("button", { name: "Click to play" }).click();
  await wait.goes(page.getByRole("button", { name: "Click to play" }));

  if (seed !== undefined) {
    await page.evaluate((s) => window.__world.getState().newWorld(s), seed);
    await wait.rendererSettled();
  }

  return ready;
}
