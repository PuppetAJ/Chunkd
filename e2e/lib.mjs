/**
 * Shared parts of the end-to-end suites.
 *
 * This exists so that a throwaway script for whatever is being worked on right
 * now can reuse the suite's setup instead of copying it. The full suite is a
 * single scenario that signs up, builds a world, posts it and comments on it,
 * so later checks depend on earlier ones and there is no way to run one in
 * isolation. Running the whole thing to see one assertion takes four minutes,
 * which is long enough that it stops being used while iterating.
 *
 * A scratch script is now about ten lines:
 *
 *   import { BASE, launch, helpers, reporter, newUser, signUp, openEditor } from "./lib.mjs";
 *   const { page, close } = await launch();
 *   const wait = helpers(page);
 *   const { check, report } = reporter();
 *   await signUp(page, newUser());
 *   await openEditor(page, wait);
 *   check("the thing I am building works", ...);
 *   await close();
 *   process.exit(report());
 *
 * Because smoke.mjs is built from these same pieces, moving a check that works
 * out of a scratch script and into the suite is moving lines rather than
 * rewriting them.
 */
import { chromium } from "playwright";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Open a browser with the suite's instrumentation already in place.
 *
 * `pageErrors` collects uncaught errors from the page, which the suite treats
 * as failures in their own right. Pointer lock is recorded rather than
 * prevented: an automated browser refuses every request, so nothing here can
 * prove that mouse-look works, but it can prove that nothing asks for the
 * mouse when it should not.
 */
export async function launch({ width = 1280, height = 800 } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });

  await page.addInitScript(() => {
    window.__lockRequests = [];
    const request = Element.prototype.requestPointerLock;
    Element.prototype.requestPointerLock = function (...args) {
      window.__lockRequests.push(new Error().stack?.includes("drei") ? "drei" : "editor");
      return request.apply(this, args);
    };
  });

  const pageErrors = [];
  page.on("pageerror", (error) => {
    // Pointer lock cannot be granted to a headless browser. Not a defect.
    if (!/pointer lock/i.test(error.message)) pageErrors.push(error.message);
  });

  return { browser, page, pageErrors, close: () => browser.close() };
}

/**
 * Ways of waiting for a condition rather than for a duration.
 *
 * The suite used fixed pauses everywhere and failed roughly one run in three,
 * because anything competing for the machine pushed an assertion past its
 * window. None of these throw on a timeout: the check that follows is what
 * should fail, with its own message, rather than an exception ending the run.
 */
export function helpers(page) {
  /** Wait for a condition inside the page. Returns whether it arrived. */
  const until = async (probe, arg = null, timeout = 15000) => {
    try {
      await page.waitForFunction(probe, arg, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Let the render loop run. Some editor state is sampled per frame rather
   * than handled on the event, so a couple of frames is the real unit of
   * waiting, and it is also the only sensible way to wait when the correct
   * outcome is that nothing happens.
   *
   * Not cheap: a frame in a headless browser drawing a full world takes about
   * a second, so this is for a couple of frames rather than for tens of them.
   */
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

  /** Wait for the thing a check is about to assert on to be there. */
  const appears = (locator, timeout = 15000) =>
    locator.first().waitFor({ state: "visible", timeout }).catch(() => {});

  /** Wait for it to be gone. */
  const goes = (locator, timeout = 15000) =>
    locator.first().waitFor({ state: "detached", timeout }).catch(() => {});

  /**
   * Poll a condition in the test process rather than in the page. For things
   * this script observed, such as a request going past, which the page itself
   * knows nothing about.
   */
  const waitFor = async (predicate, timeout = 15000, interval = 100) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await predicate()) return true;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return false;
  };

  /**
   * The renderer has caught up with the world when it is drawing an instance
   * for every visible block. This is the condition the suite's old five and
   * nine second pauses were standing in for.
   */
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

/**
 * Collects results and prints them.
 *
 * `report` returns the exit code rather than calling process.exit itself, so a
 * caller can close the browser first.
 */
export function reporter() {
  const results = [];
  let lastCheckAt = Date.now();

  function check(name, ok, detail = "") {
    const now = Date.now();
    results.push({ name, ok, ms: now - lastCheckAt });
    lastCheckAt = now;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "   " + detail}`);
  }

  function report(pageErrors = []) {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);

    // Run with E2E_TIMING=1 to see where the time goes. Each figure is the
    // time from the previous check to this one, so it covers the work in
    // between rather than the assertion itself. Worth looking at before trying
    // to speed this up: guessing which steps are slow is how an afternoon gets
    // spent on the wrong ones.
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

/** A fresh account. The stamp keeps runs from colliding with each other. */
export function newUser() {
  const stamp = Date.now();
  return {
    username: `e2e${stamp}`.slice(0, 20),
    email: `e2e${stamp}@chunkd.test`,
    password: "supersecret1",
  };
}

/** Create an account and end up signed in on the feed. */
export async function signUp(page, user) {
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.fill("#username", user.username);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });
  return user;
}

/** Sign in as the shared demo account. Faster than signing up. */
export async function signInAsDemo(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /demo/i }).first().click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });
}

/**
 * Open the editor, wait for a world to be drawn, and start play.
 *
 * Pass a seed to pin the world. A fresh editor seeds itself at random, so
 * where the player lands, and therefore whether a given camera angle can
 * legally place a block, changes from run to run.
 */
export async function openEditor(page, wait, seed) {
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
  const ready = await wait.rendererSettled();

  await page.getByRole("button", { name: "Click to play" }).click();
  await wait.goes(page.getByRole("button", { name: "Click to play" }));

  if (seed !== undefined) {
    await page.evaluate((s) => window.__world.getState().newWorld(s), seed);
    await wait.rendererSettled();
  }

  return ready;
}
