import assert from "node:assert/strict";
import test from "node:test";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GraphQLError } from "graphql";

import {
  emailError,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  passwordError,
  requestErrorMessage,
  usernameError,
} from "./credentials.ts";

test("a username is trimmed before its length is judged", () => {
  assert.equal(usernameError("  ab  "), usernameError("ab"));
  assert.equal(usernameError("   "), "Pick a username.");
  assert.equal(usernameError("a".repeat(MIN_USERNAME_LENGTH)), null);
  assert.equal(usernameError("a".repeat(MAX_USERNAME_LENGTH + 1))?.includes("at most"), true);
});

test("an email needs something either side of an @ and a dot after it", () => {
  assert.equal(emailError("someone@example.com"), null);
  assert.equal(emailError("someone@example"), "That does not look like an email address.");
  assert.equal(emailError(""), "Enter your email address.");
});

test("a password is judged on length alone", () => {
  assert.equal(passwordError("a".repeat(MIN_PASSWORD_LENGTH)), null);
  assert.ok(passwordError("a".repeat(MIN_PASSWORD_LENGTH - 1)));
  assert.equal(passwordError(""), "Enter a password.");
});

test("a failed request shows the server's own words when it has any", () => {
  const fromServer = new CombinedGraphQLErrors({ errors: [new GraphQLError("That username is taken.")] });
  assert.equal(requestErrorMessage(fromServer), "That username is taken.");
  assert.equal(requestErrorMessage(new Error("Failed to fetch")), "Failed to fetch");
  assert.equal(requestErrorMessage(undefined), "Something went wrong. Please try again.");
});
