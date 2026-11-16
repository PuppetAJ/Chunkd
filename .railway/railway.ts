import { defineRailway, github, mongo, preserve, project, service } from "railway/iac";

/**
 * Service names must match the dashboard, and everything the project holds
 * must be listed: an omission reads as a deletion.
 */
export default defineRailway(() => {
  const repository = github("PuppetAJ/Chunkd", { checkSuites: true });

  const database = mongo("MongoDB");

  const api = service("Chunkd", {
    source: repository,
    build: "pnpm build",
    start: "pnpm start",
    deploy: {
      healthcheckPath: "/health",
      healthcheckTimeout: 100,
      // No restart policy: Railway stores the default as unset, so declaring
      // it would show as a pending change forever.
      sleepApplication: true,
      numReplicas: 1,
    },
    env: {
      NODE_ENV: "production",
      PORT: "8080",
      CLIENT_ORIGIN: preserve(),
      JWT_SECRET: preserve(),
      MONGODB_URI: preserve(),
    },
  });

  const reset = service("reset", {
    source: repository,
    build: "pnpm --filter server build",
    start: "pnpm --filter server seed",
    deploy: {
      cronSchedule: "0 */6 * * *",
      restartPolicyType: "NEVER",
    },
    env: {
      NODE_ENV: "production",
      SEED_ALLOW_PRODUCTION: "1",
      JWT_SECRET: preserve(),
      MONGODB_URI: preserve(),
    },
  });

  return project("chunkd", { resources: [database, api, reset] });
});
