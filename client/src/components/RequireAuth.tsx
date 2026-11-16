import { useRef, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "../lib/auth.ts";

export default function RequireAuth({
  children,
  keepMounted = false,
}: {
  children: ReactNode;
  keepMounted?: boolean;
}) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const signedOutFrom = useAuthStore((state) => state.signedOutFrom);
  const location = useLocation();

  const arrivedSignedIn = useRef(false);
  if (isLoggedIn) arrivedSignedIn.current = true;

  if (!isLoggedIn) {
    if (keepMounted && arrivedSignedIn.current && location.pathname !== signedOutFrom) {
      return <>{children}</>;
    }

    if (location.pathname === signedOutFrom) return <Navigate to="/" replace />;

    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
