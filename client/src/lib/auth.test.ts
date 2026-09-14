import assert from "node:assert/strict";
import test from "node:test";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";

import { isUnauthenticated } from "./auth.ts";
import { requestErrorMessage } from "./credentials.ts";

/** A failure shaped the way Apollo 4 hands one to a caller. */
function graphQLFailure(code: string, message = "No.") {
  const errors = [{ message, extensions: { code } }];
  return new CombinedGraphQLErrors({ data: null, errors }, errors);
}

test("an expired session is recognised", () => {
  assert.equal(isUnauthenticated(graphQLFailure("UNAUTHENTICATED")), true);
});

test("other failures are not mistaken for an expired session", () => {
  assert.equal(isUnauthenticated(graphQLFailure("BAD_USER_INPUT")), false);
  assert.equal(isUnauthenticated(new Error("something else")), false);
  assert.equal(isUnauthenticated(null), false);
});

// The check used to read `graphQLErrors`, which is where Apollo 3 kept them.
// Nothing matched, so an expired token was never noticed and the only sign of
// it was a save that failed with no way forward.
test("the version 3 error shape is not what is looked for", () => {
  const version3 = Object.assign(new Error("No."), {
    graphQLErrors: [{ message: "No.", extensions: { code: "UNAUTHENTICATED" } }],
  });
  assert.equal(isUnauthenticated(graphQLFailure("UNAUTHENTICATED")), true, "the real shape matches");
  assert.equal(isUnauthenticated(version3), false, "and the old one is not the real shape");
});

test("a failed request is described by the server's own message", () => {
  assert.equal(requestErrorMessage(graphQLFailure("BAD_USER_INPUT", "That name is taken.")), "That name is taken.");
});

test("a request that never arrived says so", () => {
  const unreachable = new ServerError("fetch failed", {
    response: new Response(null, { status: 502 }),
    bodyText: "",
  });
  assert.match(requestErrorMessage(unreachable), /Could not reach the server/);
});

test("anything unrecognised still produces a sentence", () => {
  assert.equal(requestErrorMessage(undefined), "Something went wrong. Please try again.");
});
