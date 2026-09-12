import { GraphQLError } from "graphql";

/**
 * A per-address limit on how often something can be tried. The rate limiter in
 * server.ts counts every GraphQL request the same, which is generous for
 * password guessing, so the sign-in mutations apply this tighter one too.
 *
 * In memory: the API runs as one process. Several instances would need a
 * shared store.
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
