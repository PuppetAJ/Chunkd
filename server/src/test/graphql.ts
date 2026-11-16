import { ApolloServer } from "@apollo/server";
import mongoose from "mongoose";
import { env } from "../config/env.ts";
import { typeDefs, resolvers } from "../schemas/index.ts";
import type { GraphQLContext } from "../utils/auth.ts";
import { createLoaders } from "../utils/loaders.ts";

export interface Identity {
  _id: string;
  username: string;
  email: string;
}

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
    { contextValue: { user, ip: "test", loaders: createLoaders() } },
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
  return { _id: result.data?.["addUser"].user._id, username, email };
}

export const PASSWORD = "supersecret1";
