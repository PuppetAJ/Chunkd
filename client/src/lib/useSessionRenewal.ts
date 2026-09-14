import { useEffect } from "react";
import { useMutation } from "@apollo/client/react";

import { RENEW_TOKEN } from "../utils/mutations.ts";
import { useAuthStore } from "./auth.ts";

/** How long before a token runs out to trade it for a fresh one. */
const RENEW_BEFORE_MS = 10 * 60 * 1000;

/**
 * The least time between renewals. Without it, a deployment configured with a
 * session shorter than the window above would renew in a tight loop, since
 * every fresh token would already be inside it.
 */
const MIN_GAP_MS = 30 * 1000;

/**
 * Keep the session alive for as long as the tab is open.
 *
 * A token lasts a fixed two hours, which is shorter than an afternoon spent
 * building, and the editor holds a world that exists nowhere but in memory. A
 * session that ends on the clock therefore used to end with unsaved work.
 */
export function useSessionRenewal(): void {
  const token = useAuthStore((state) => state.token);
  const expiresAt = useAuthStore((state) => state.user?.exp ?? null);
  const logIn = useAuthStore((state) => state.logIn);
  const [renewToken] = useMutation(RENEW_TOKEN);

  useEffect(() => {
    if (!token || expiresAt === null) return;

    const due = Math.max(MIN_GAP_MS, expiresAt * 1000 - Date.now() - RENEW_BEFORE_MS);
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await renewToken();
        const fresh = (data as { renewToken?: { token?: string } } | null)?.renewToken?.token;
        // Storing it schedules the next renewal, since this reads the new token.
        if (fresh) logIn(fresh);
      } catch {
        // The session ends when it ends. The editor asks for a password rather
        // than throwing the world away, so there is nothing to recover here.
      }
    }, due);

    return () => window.clearTimeout(timer);
  }, [token, expiresAt, renewToken, logIn]);
}
