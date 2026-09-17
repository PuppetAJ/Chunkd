import { defineRailway, github, mongo, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const repository = github("PuppetAJ/Chunkd");

  // Declared so it is not read as a resource to remove. The URLs pointing at
  // it are preserved rather than rewritten from here.
  const database = mongo("MongoDB");

  const api = service("Chunkd", {
    source: repository,
    build: "pnpm build",
    start: "pnpm start",
    deploy: {
      healthcheckPath: "/health",
      healthcheckTimeout: 100,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
      // Idle containers are billed by the second, so the service stops when
      // nothing is using it and wakes on the next request.
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
      // A failed run waits for the next schedule rather than retrying in a loop.
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
