import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);

/**
 * One project per suite, since each wants a different server: `pnpm test:e2e` runs the smoke suite against `pnpm dev`,
 * `test:session` against a server handing out short-lived tokens, `test:a11y` against the app, and `test:prod` against a
 * production build on port 4000. A run never mixes them.
 */
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  // The smoke suite is one long scenario, about eleven minutes on a CI runner.
  timeout: 30 * 60_000,
  // Once on CI; a test that passes on its retry is marked flaky rather than hidden.
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    // Only a retry records a trace: recording pauses between actions, which holds a click in the editor long enough to
    // dig twice. CI retries a failure once, so it still gets a trace; locally, `--trace on` records one.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "smoke", testMatch: "smoke.spec.mjs" },
    { name: "session", testMatch: "session.spec.mjs" },
    { name: "a11y", testMatch: "a11y.spec.mjs", use: { viewport: { width: 1280, height: 900 } } },
    {
      name: "production",
      testMatch: "production.spec.mjs",
      use: { baseURL: process.env.BASE ?? "http://localhost:4000", viewport: { width: 1280, height: 900 } },
    },
  ],
});
