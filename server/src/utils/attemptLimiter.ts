import { GraphQLError } from "graphql";

/**
 * A per-address limit on how often something can be tried.
 *
 * The general rate limiter in server.ts counts every GraphQL request the same,
 * so a hundred and twenty requests a minute is the budget for password
 * guessing as much as for reading the feed. That is generous for guessing.
 * This adds a second, much tighter limit that only the sign-in mutations
 * apply, keyed by the caller's address.
 *
 * It is in memory. The API runs as one process, and a restart clearing the
 * counters is not a problem worth a database round trip per attempt. If the
 * API ever runs as several instances this would need a shared store.
 */
export function attemptLimiter(what: string, maxAttempts: number, windowMs: number) {
  // Timestamps of recent attempts, per address.
  const recent = new Map<string, number[]>();

  return (address: string): void => {
    const now = Date.now();
    const cutoff = now - windowMs;

    const attempts = (recent.get(address) ?? []).filter((at) => at > cutoff);
    if (attempts.length >= maxAttempts) {
      const minutes = Math.ceil(windowMs / 60_000);
      throw new GraphQLError(
        `Too many ${what} attempts from this address. Try again in ${minutes} minutes.`,
        { extensions: { code: "RATE_LIMITED", http: { status: 429 } } },
      );
    }

    attempts.push(now);
    recent.set(address, attempts);

    // Addresses that have gone quiet are dropped, so the map does not grow
    // with every visitor the process has ever seen.
    if (recent.size > 10_000) {
      for (const [key, times] of recent) {
        if (times.every((at) => at <= cutoff)) recent.delete(key);
      }
    }
  };
}
