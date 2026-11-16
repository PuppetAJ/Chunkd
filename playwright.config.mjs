import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env")) process.loadEnvFile(".env");

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  timeout: 30 * 60_000,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    // Only a retry records a trace: recording pauses between actions, which holds
    // a click in the editor long enough to dig twice.
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
