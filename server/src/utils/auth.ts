import jwt, { type SignOptions } from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { env } from "../config/env.ts";
import type { UserDocument } from "../models/index.ts";
import type { Loaders } from "./loaders.ts";

// What is signed into the auth token.
export interface AuthUser {
  _id: string;
  username: string;
  email: string;
}

export interface GraphQLContext {
  user: AuthUser | null;
  /** Where the request came from, for the per-address attempt limits. */
  ip: string;
  /** Built fresh per request. See utils/loaders.ts for why that matters. */
  loaders: Loaders;
}

export function signToken(user: UserDocument): string {
  const payload: AuthUser = {
    _id: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

// An invalid token is treated the same as no token at all.
export function getUserFromAuthHeader(header: string | undefined): AuthUser | null {
  if (!header) return null;

  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  if (!token) return null;

  try {
    // Pinned to the one algorithm we sign with.
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as AuthUser;
  } catch {
    return null;
  }
}

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
