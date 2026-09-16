import { useRef, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "../lib/auth.ts";

export default function RequireAuth({
  children,
  keepMounted = false,
}: {
  children: ReactNode;
  /**
   * Stay mounted when the session ends, for a page holding work that only exists
   * in the browser. The page must then ask for a sign-in itself.
   */
  keepMounted?: boolean;
}) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const signedOutFrom = useAuthStore((state) => state.signedOutFrom);
  const location = useLocation();

  // Redirecting someone never logged in is right; unmounting a world because a token ran out is not.
  const arrivedSignedIn = useRef(false);
  if (isLoggedIn) arrivedSignedIn.current = true;

  if (!isLoggedIn) {
    if (keepMounted && arrivedSignedIn.current && location.pathname !== signedOutFrom) {
      return <>{children}</>;
    }

    // A deliberate sign-out ends on the landing page and remembers nothing; an
    // expired session sends the visitor back where they were going.
    if (location.pathname === signedOutFrom) return <Navigate to="/" replace />;

    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
