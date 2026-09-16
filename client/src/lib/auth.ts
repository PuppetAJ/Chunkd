import { create } from "zustand";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "id_token";

// The auth token's payload. `exp` is a Unix time in seconds.
export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  exp: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** True only when there is a token and it has not expired. */
  isLoggedIn: boolean;
  /** The page a deliberate sign-out was made from, which tells it apart from an expired session. */
  signedOutFrom: string | null;
  /** Kept when a session expires so signing back in only asks for a password. */
  lastEmail: string | null;
  logIn: (token: string) => void;
  /** Sign out on purpose. Pass the page it was done from. */
  logOut: (from?: string) => void;
}

function readToken(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const user = jwtDecode<AuthUser>(token);
    if (typeof user.exp !== "number" || user.exp * 1000 <= Date.now()) return null;
    return user;
  } catch {
    return null;
  }
}

function forgetToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage may be unavailable.
  }
}

function loadFromStorage(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing can throw here.
    return null;
  }
}

const initialToken = loadFromStorage();
const initialUser = readToken(initialToken);

export const useAuthStore = create<AuthState>((set) => ({
  token: initialUser ? initialToken : null,
  user: initialUser,
  isLoggedIn: initialUser !== null,
  signedOutFrom: null,
  lastEmail: initialUser?.email ?? null,

  logIn: (token: string) => {
    const user = readToken(token);
    if (!user) return;
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // The session then lasts this tab only.
    }
    set({ token, user, isLoggedIn: true, signedOutFrom: null, lastEmail: user.email });
  },

  logOut: (from?: string) => {
    forgetToken();
    set({ token: null, user: null, isLoggedIn: false, signedOutFrom: from ?? null, lastEmail: null });
  },
}));

// For the Apollo link, outside React.
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

/** Drop a session the server has stopped accepting. Not `logOut`: nobody asked for this. */
export function forceLogOut(): void {
  forgetToken();
  // `lastEmail` is left alone on purpose.
  useAuthStore.setState({ token: null, user: null, isLoggedIn: false });
}

/**
 * Whether a request failed because the session is over. Apollo 4 wraps GraphQL
 * errors in CombinedGraphQLErrors.
 */
export function isUnauthenticated(error: unknown): boolean {
  if (!CombinedGraphQLErrors.is(error)) return false;
  return error.errors.some((one) => one.extensions?.["code"] === "UNAUTHENTICATED");
}
