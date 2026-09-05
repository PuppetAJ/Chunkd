import { create } from "zustand";
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
  logIn: (token: string) => void;
  logOut: () => void;
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

  logIn: (token: string) => {
    const user = readToken(token);
    if (!user) return;
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Not being able to persist is survivable; the session lasts this tab.
    }
    set({ token, user, isLoggedIn: true });
  },

  logOut: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
    set({ token: null, user: null, isLoggedIn: false });
  },
}));

// Read the token outside of React, for the Apollo link that attaches it to
// every request.
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

export function forceLogOut(): void {
  useAuthStore.getState().logOut();
}
