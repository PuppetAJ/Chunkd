import { GraphQLError } from "graphql";

/**
 * A per-address limit on how often something can be tried, tighter than the
 * general rate limiter. In memory, so it assumes one API process.
 */
export function attemptLimiter(what: string, maxAttempts: number, windowMs: number) {
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

    // Drop addresses that have gone quiet, so the map does not grow forever.
    if (recent.size > 10_000) {
      for (const [key, times] of recent) {
        if (times.every((at) => at <= cutoff)) recent.delete(key);
      }
    }
  };
}
