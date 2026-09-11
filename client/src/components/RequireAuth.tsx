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
  const signedOutFrom = useAuthStore((state) => state.signedOutFrom);
  const location = useLocation();

  if (!isLoggedIn) {
    // Signing out on purpose ends on the landing page, and nothing is
    // remembered: being returned to the page you just left, the next time you
    // sign in, is not what logging out means. An expired session is the other
    // way round, because there the visitor was going somewhere and was
    // interrupted.
    //
    // This is also what stops the two halves of signing out disagreeing. The
    // account menu navigates away at the same time as this runs, and whichever
    // got there first used to decide the destination.
    if (location.pathname === signedOutFrom) return <Navigate to="/" replace />;

    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
