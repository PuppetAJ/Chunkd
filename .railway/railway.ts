import { defineRailway, github, preserve, project, service } from "railway/iac";

/**
 * The Railway project, as code. Replaces railway.json and railway.reset.json,
 * which Railway deprecated. Apply it with `railway config apply`, which shows
 * what it would change and asks before doing it.
 *
 * The service names below have to match the ones in the dashboard, or the plan
 * will offer to create new services rather than update the existing ones. The
 * MongoDB service is deliberately left out: nothing here needs to manage it,
 * and the URLs pointing at it are preserved rather than rewritten.
 */
export default defineRailway(() => {
  const repository = github("PuppetAJ/Chunkd");

  const api = service("Chunkd", {
    source: repository,
    build: "pnpm build",
    start: "pnpm start",
    deploy: {
      healthcheckPath: "/health",
      healthcheckTimeout: 100,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
      // The sign-in rate limiter counts in memory, so a second replica would
      // double the allowance.
      numReplicas: 1,
    },
    env: {
      NODE_ENV: "production",
      // The server listens on this and the domain routes to it, so the two
      // cannot drift apart.
      PORT: "8080",
      // preserve() keeps whatever the dashboard holds. Secrets and the
      // deployment's own URL stay out of the repository.
      CLIENT_ORIGIN: preserve(),
      JWT_SECRET: preserve(),
      MONGODB_URI: preserve(),
    },
  });

  // Wipes the database and rebuilds it from showcaseBuilds.json. It is the
  // same repository with a different start command: without that it would run
  // the API, never exit, and the schedule would do nothing.
  const reset = service("reset", {
    source: repository,
    // The server has no build step, so this skips building a client the reset
    // does not need.
    build: "pnpm --filter server build",
    start: "pnpm --filter server seed",
    deploy: {
      cronSchedule: "0 */6 * * *",
      // A failed run waits for the next schedule rather than retrying in a loop.
      restartPolicyType: "NEVER",
    },
    env: {
      NODE_ENV: "production",
      // Only here. Without it the seeder refuses to touch a production
      // database, which is what stops it being run by hand against the wrong one.
      SEED_ALLOW_PRODUCTION: "1",
      // The seeder signs no tokens, but it reads the environment module, which
      // checks every variable as soon as it is imported.
      JWT_SECRET: preserve(),
      MONGODB_URI: preserve(),
    },
  });

  return project("chunkd", { resources: [api, reset] });
});
