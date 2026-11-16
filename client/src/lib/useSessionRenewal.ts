import { useEffect } from "react";
import { useMutation } from "@apollo/client/react";

import { RENEW_TOKEN } from "../utils/mutations.ts";
import { useAuthStore } from "./auth.ts";

const RENEW_BEFORE_MS = 10 * 60 * 1000;

const MIN_GAP_MS = 30 * 1000;

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
        if (fresh) logIn(fresh);
      } catch {
      }
    }, due);

    return () => window.clearTimeout(timer);
  }, [token, expiresAt, renewToken, logIn]);
}
