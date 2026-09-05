import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "../lib/auth.ts";

// One place that decides what a logged-out visitor sees.
//
// Previously each protected page repeated its own copy of this check, and two
// of those copies redirected to routes that do not exist ("/Editor" with a
// capital E, and "/test"). Wrapping the route instead means the check cannot
// drift between pages.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const location = useLocation();

  if (!isLoggedIn) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
