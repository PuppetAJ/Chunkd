import { create } from "zustand";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "id_token";

// What the server puts inside the auth token. `exp` is added by the JWT library
// itself and is a Unix time in seconds.
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
  /**
   * The page a deliberate sign-out was made from, if any.
   *
   * It exists so that signing out and having a session expire can be told
   * apart. Both end with no token, but they mean different things about where
   * the visitor should end up.
   */
  signedOutFrom: string | null;
  /**
   * The address of the last session, kept when one expires so that signing
   * back in only asks for a password. Cleared by a deliberate sign-out.
   */
  lastEmail: string | null;
  logIn: (token: string) => void;
  /** Sign out on purpose. Pass the page it was done from. */
  logOut: (from?: string) => void;
}

function readToken(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const user = jwtDecode<AuthUser>(token);
    // An expired token is the same as no token. The old code had this backwards:
    // if decoding threw it reported the token as *not* expired.
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
    // Nothing to clean up if storage is unavailable.
  }
}

function loadFromStorage(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing modes can throw on access rather than return null.
    return null;
  }
}

const initialToken = loadFromStorage();
const initialUser = readToken(initialToken);

export const useAuthStore = create<AuthState>((set) => ({
  // If the stored token turned out to be expired, drop it now.
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
      // Not being able to persist is survivable; the session lasts this tab.
    }
    set({ token, user, isLoggedIn: true, signedOutFrom: null, lastEmail: user.email });
  },

  logOut: (from?: string) => {
    forgetToken();
    set({ token: null, user: null, isLoggedIn: false, signedOutFrom: from ?? null, lastEmail: null });
  },
}));

// Read the token outside of React, for the Apollo link that attaches it to
// every request.
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

/**
 * Drop a session the server has stopped accepting, usually an expired token.
 *
 * Deliberately not `logOut`: nobody asked for this, so the page they were on is
 * still where they were trying to be and is worth returning them to.
 */
export function forceLogOut(): void {
  forgetToken();
  // `lastEmail` is deliberately left alone: whoever was here is still here.
  useAuthStore.setState({ token: null, user: null, isLoggedIn: false });
}

/**
 * Whether a failed request failed because the session is over.
 *
 * Apollo 4 hands every GraphQL failure over as one CombinedGraphQLErrors
 * holding the server's errors. The check here used to read `graphQLErrors`,
 * which is where version 3 kept them, so it never matched and an expired token
 * was never noticed: the save simply failed and left no way forward.
 */
export function isUnauthenticated(error: unknown): boolean {
  if (!CombinedGraphQLErrors.is(error)) return false;
  return error.errors.some((one) => one.extensions?.["code"] === "UNAUTHENTICATED");
}
