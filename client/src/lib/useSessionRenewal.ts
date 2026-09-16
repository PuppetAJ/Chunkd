import { useEffect } from "react";
import { useMutation } from "@apollo/client/react";

import { RENEW_TOKEN } from "../utils/mutations.ts";
import { useAuthStore } from "./auth.ts";

/** How long before a token runs out to trade it for a fresh one. */
const RENEW_BEFORE_MS = 10 * 60 * 1000;

/** Without this, a session shorter than RENEW_BEFORE_MS would renew in a tight loop. */
const MIN_GAP_MS = 30 * 1000;

/** Keep the session alive while the tab is open, so a token does not expire mid-build. */
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
        // Storing it schedules the next renewal.
        if (fresh) logIn(fresh);
      } catch {
        // The editor asks for a password rather than throwing the world away.
      }
    }, due);

    return () => window.clearTimeout(timer);
  }, [token, expiresAt, renewToken, logIn]);
}
