import jwt, { type SignOptions } from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { env } from "../config/env.ts";
import type { UserDocument } from "../models/index.ts";

// What we put inside the auth token, and therefore what every resolver can
// rely on knowing about the caller without touching the database.
export interface AuthUser {
  _id: string;
  username: string;
  email: string;
}

// The object handed to every resolver as its third argument.
export interface GraphQLContext {
  user: AuthUser | null;
  /** Where the request came from, for the per-address attempt limits. */
  ip: string;
}

export function signToken(user: UserDocument): string {
  const payload: AuthUser = {
    _id: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  // The secret used to come from a string literal committed to this file. It now
  // comes from the environment and the process will not boot without it.
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

// Pull the caller out of an incoming request, or return null if there is no
// valid token. An invalid token is treated the same as no token at all.
export function getUserFromAuthHeader(header: string | undefined): AuthUser | null {
  if (!header) return null;

  // Accept both "Bearer <token>" and a bare token.
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  if (!token) return null;

  try {
    // Pinned to the one algorithm we sign with. jsonwebtoken already limits a
    // string secret to the HMAC family, so this is belt and braces rather than
    // the fix for a known hole, but it costs nothing and it will still hold if
    // the signing key ever changes shape.
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as AuthUser;
  } catch {
    return null;
  }
}

// Resolvers call this instead of repeating the same `if (context.user)` check.
// It narrows the type too, so after calling it TypeScript knows the user exists.
export function requireAuth(context: GraphQLContext): AuthUser {
  if (!context.user) {
    throw new GraphQLError("You must be logged in to do that.", {
      extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
    });
  }
  return context.user;
}

export function forbidden(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: "FORBIDDEN", http: { status: 403 } },
  });
}

export function badRequest(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT", http: { status: 400 } },
  });
}

export function notFound(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: "NOT_FOUND", http: { status: 404 } },
  });
}

/**
 * Turn a Mongoose validation failure into a message worth showing someone.
 * Mongoose reports one error holding an entry per bad field, which otherwise
 * reaches the browser as an internal error and is shown as "Signup failed".
 *
 * Returns null for anything else, so callers can rethrow untouched.
 */
export function asUserInputError(error: unknown): GraphQLError | null {
  if (!error || typeof error !== "object") return null;
  if ((error as { name?: string }).name !== "ValidationError") return null;

  const fields = (error as { errors?: Record<string, { message?: string }> }).errors ?? {};
  const messages: string[] = [];
  for (const field of Object.values(fields)) {
    if (field && typeof field.message === "string") messages.push(field.message);
  }

  return badRequest(messages.length > 0 ? messages.join(" ") : "Those details are not valid.");
}
