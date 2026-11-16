import { create } from "zustand";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "id_token";

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  exp: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  signedOutFrom: string | null;
  lastEmail: string | null;
  logIn: (token: string) => void;
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
  } catch {}
}

function loadFromStorage(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
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
    } catch {}
    set({ token, user, isLoggedIn: true, signedOutFrom: null, lastEmail: user.email });
  },

  logOut: (from?: string) => {
    forgetToken();
    set({ token: null, user: null, isLoggedIn: false, signedOutFrom: from ?? null, lastEmail: null });
  },
}));

export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

export function forceLogOut(): void {
  forgetToken();
  useAuthStore.setState({ token: null, user: null, isLoggedIn: false });
}

export function isUnauthenticated(error: unknown): boolean {
  if (!CombinedGraphQLErrors.is(error)) return false;
  return error.errors.some((one) => one.extensions?.["code"] === "UNAUTHENTICATED");
}
