import { ApolloServer } from "@apollo/server";
import mongoose from "mongoose";
import { env } from "../config/env.ts";
import { typeDefs, resolvers } from "../schemas/index.ts";
import type { GraphQLContext } from "../utils/auth.ts";

/**
 * Runs operations against the real schema and a real database, the way a
 * request would, minus HTTP. The caller passes the signed-in user directly
 * instead of a token, since what the token carries is what the context holds.
 */

/** Who the request is from: the same fields a token carries. */
export interface Identity {
  _id: string;
  username: string;
  email: string;
}

/** A response, flattened. `data` is read by hand in the tests, so it is left loosely typed. */
export interface Result {
  data: Record<string, any> | null;
  errors: { message: string; code: string }[];
}

const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
let started: Promise<void> | null = null;

export async function run(
  query: string,
  variables: Record<string, unknown> = {},
  user: Identity | null = null,
): Promise<Result> {
  started ??= server.start();
  await started;
  const response = await server.executeOperation(
    { query, variables },
    { contextValue: { user, ip: "test" } },
  );
  if (response.body.kind !== "single") throw new Error("Unexpected streamed response");
  const { data, errors } = response.body.singleResult;
  return {
    data: (data as Record<string, any> | null | undefined) ?? null,
    errors: (errors ?? []).map((error) => ({
      message: error.message,
      code: String(error.extensions?.["code"] ?? ""),
    })),
  };
}

export async function connectTestDatabase(): Promise<void> {
  // Every test run drops the database, so it must never be a real one.
  if (!/\/chunkd_test(\?|$)/.test(env.MONGODB_URI)) {
    throw new Error(`Tests only run against a database called chunkd_test, not ${env.MONGODB_URI}`);
  }
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  await mongoose.connection.dropDatabase();
}

export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await server.stop();
}

let accounts = 0;

/** A fresh account each time, so no test depends on another's data. */
export async function signUp(): Promise<Identity> {
  accounts += 1;
  const username = `tester${accounts}`;
  const email = `${username}@chunkd.test`;
  const result = await run(
    `mutation ($username: String!, $email: String!, $password: String!) {
      addUser(username: $username, email: $email, password: $password) { user { _id } }
    }`,
    { username, email, password: PASSWORD },
  );
  if (result.errors.length > 0) throw new Error(result.errors[0]?.message);
  // The email is not read back: the response hides it from anyone who is not
  // signed in, and at sign-up nobody is yet.
  return { _id: result.data?.["addUser"].user._id, username, email };
}

/** The password `signUp` uses. */
export const PASSWORD = "supersecret1";
