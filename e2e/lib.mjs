/**
 * Shared parts of the end-to-end suites, so a throwaway script can reuse the
 * setup instead of copying it:
 *
 *   import { launch, helpers, reporter, newUser, signUp, openEditor } from "./lib.mjs";
 *   const { page, pageErrors, close } = await launch();
 *   const wait = helpers(page);
 *   const { check, report } = reporter();
 *   await signUp(page, newUser());
 *   await openEditor(page, wait);
 *   check("the thing I am building works", ...);
 *   await close();
 *   process.exit(report(pageErrors));
 */
import { chromium } from "playwright";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export async function launch({ width = 1280, height = 800 } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });

  // An automated browser refuses every pointer lock request, so the suite
  // records who asked rather than checking whether the lock was granted.
  await page.addInitScript(() => {
    window.__lockRequests = [];
    const request = Element.prototype.requestPointerLock;
    Element.prototype.requestPointerLock = function (...args) {
      window.__lockRequests.push(new Error().stack?.includes("drei") ? "drei" : "editor");
      return request.apply(this, args);
    };
  });

  // Post-processing costs a great deal on a software renderer, which is what
  // every browser here has, and it turned a three minute run into a ten minute
  // one. The suite runs with it off and switches it on for the check that
  // covers it. Merged into whatever is already stored, so the checks that
  // prove a scene preference survives a reload still see their own setting.
  await page.addInitScript(() => {
    for (const key of ["editor-settings", "viewer-settings"]) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
        localStorage.setItem(key, JSON.stringify({ ...saved, effects: false }));
      } catch {
        // A browser that refuses storage renders with the effects on, slowly.
      }
    }
  });

  const pageErrors = [];
  page.on("pageerror", (error) => {
    if (!/pointer lock/i.test(error.message)) pageErrors.push(error.message);
  });

  return { browser, page, pageErrors, close: () => browser.close() };
}

/**
 * Ways of waiting for a condition rather than for a duration. None of them
 * throw on a timeout, so the check that follows is what fails, with its own
 * message, rather than an exception ending the run.
 */
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

  /** The renderer is up to date when it draws an instance for every visible block. */
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

export function reporter() {
  const results = [];
  let lastCheckAt = Date.now();

  function check(name, ok, detail = "") {
    const now = Date.now();
    results.push({ name, ok, ms: now - lastCheckAt });
    lastCheckAt = now;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "   " + detail}`);
  }

  /** Returns the exit code rather than exiting, so the caller can close the browser first. */
  function report(pageErrors = []) {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);

    // E2E_TIMING=1 lists the slowest steps. Each figure is the time from the
    // previous check, so it covers the work between them, not the assertion.
    if (process.env.E2E_TIMING) {
      const slowest = [...results].sort((a, b) => b.ms - a.ms).slice(0, 20);
      const total = results.reduce((sum, r) => sum + r.ms, 0);
      console.log(`\nSlowest steps (${(total / 1000).toFixed(0)}s measured in total):`);
      for (const r of slowest) console.log(`  ${(r.ms / 1000).toFixed(1)}s  ${r.name}`);
    }

    if (pageErrors.length) {
      console.log(`\nUncaught page errors (${pageErrors.length}):`);
      for (const message of [...new Set(pageErrors)].slice(0, 10)) {
        console.log("  - " + message.slice(0, 200));
      }
    }

    return failed.length === 0 && pageErrors.length === 0 ? 0 : 1;
  }

  return { check, report, results };
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

/** Faster than signing up, for scripts that only need to be logged in. */
export async function signInAsDemo(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /demo/i }).first().click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });
}

/**
 * Open the editor, wait for a world to be drawn, and start play. Pass a seed
 * to pin the world: a fresh editor seeds itself at random, so where the player
 * lands, and what a fixed camera angle is aimed at, changes between runs.
 */
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
