import { CombinedGraphQLErrors, ServerError, ServerParseError } from "@apollo/client/errors";

/**
 * The sign-up rules, checked in the browser before a request goes out.
 *
 * These deliberately mirror the limits on the User schema. The server is still
 * the one that decides; this only exists so someone is told which field is
 * wrong while they are still looking at it, instead of watching the form fail
 * for a reason it never showed them.
 *
 * Each function returns the problem as a sentence, or null when the value is
 * fine, so a caller can write `const problem = passwordError(value)`.
 */

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 24;
export const MIN_PASSWORD_LENGTH = 8;

export function usernameError(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) return "Pick a username.";
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return `Your username needs at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return `Your username can be at most ${MAX_USERNAME_LENGTH} characters.`;
  }
  return null;
}

export function emailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address.";
  // The same shape the server checks for. Anything stricter rejects addresses
  // that are genuinely valid.
  if (!/.+@.+\..+/.test(trimmed)) return "That does not look like an email address.";
  return null;
}

export function passwordError(password: string): string | null {
  if (!password) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

/**
 * The sentence to show for a failed request.
 *
 * A request the server answered carries its message; one that never arrived
 * carries the browser's own wording, which is not worth showing anyone, so it
 * gets a sentence of its own.
 */
export function requestErrorMessage(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message ?? "Something went wrong. Please try again.";
  }
  if (ServerError.is(error) || ServerParseError.is(error)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (error && typeof error === "object") {
    const { message } = error as { message?: string };
    if (typeof message === "string" && message) return message;
  }
  return "Something went wrong. Please try again.";
}
