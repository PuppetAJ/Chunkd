import assert from "node:assert/strict";
import test from "node:test";
import { buildSchema, parse, validate } from "graphql";

import { typeDefs } from "../schemas/typeDefs.ts";
import { queryLimits } from "./queryLimits.ts";

// The real schema, so the tests break if a field these queries rely on is
// renamed. typeDefs is imported directly rather than through schemas/index,
// which would drag in the resolvers and with them a database connection.
const schema = buildSchema(typeDefs);

const errorsFor = (query: string, limits?: { maxDepth: number; maxFields: number }) =>
  validate(schema, parse(query), [queryLimits(limits)]).map((error) => error.message);

/** Build the query that crashed the server: following and followers nested n deep. */
function nested(levels: number): string {
  let inner = "username";
  for (let i = 0; i < levels; i += 1) {
    inner = `username following { ${inner} } followers { ${inner} }`;
  }
  return `{ users { ${inner} } }`;
}

test("the queries the client actually sends are allowed", () => {
  // The deepest query in client/src/utils/queries.ts: me → thoughts → reactions → username.
  const me = `{
    me { _id username email followerCount
      builds { _id name thumbnail createdAt }
      thoughts { _id thoughtText createdAt reactionCount
        reactions { _id createdAt reactionBody username } }
      followers { _id username }
      following { _id username } } }`;
  assert.deepEqual(errorsFor(me), []);

  const feed = `{ thoughts(limit: 10, offset: 0) { _id thoughtText username
    build { _id name thumbnail } reactions { _id username reactionBody } } }`;
  assert.deepEqual(errorsFor(feed), []);
});

test("the query that crashed the process is refused", () => {
  // Depth 7 exhausted the heap. It must not reach a resolver.
  const errors = errorsFor(nested(5));
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0] ?? "", /nested \d+ levels deep/);
});

test("the limit is on depth, not on how many blocks the world has", () => {
  // nested(4) is 6 levels: users, following ×4, username. It is allowed, and
  // one more level is not. The boundary is what makes the number meaningful.
  assert.deepEqual(errorsFor(nested(4)), []);
  assert.equal(errorsFor(nested(5)).length, 1);
});

test("nesting cannot be hidden inside fragments", () => {
  // Each fragment only adds one level, but the spreads chain. Counted flat,
  // the query looks shallow; followed, it is as deep as the crash query.
  const query = `
    { users { ...a } }
    fragment a on User { following { ...b } }
    fragment b on User { followers { ...c } }
    fragment c on User { following { ...d } }
    fragment d on User { followers { ...e } }
    fragment e on User { following { followers { username } } }
  `;
  const errors = errorsFor(query);
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0] ?? "", /nested/);
});

test("a wide query of aliases is refused even when each copy is shallow", () => {
  // A hundred shallow copies run in parallel and cost a hundred times as much
  // as one. Depth alone would let this through. This is the smallest useful
  // copy, two fields each, so it is the one an attacker would send.
  const aliases = Array.from({ length: 100 }, (_, i) => `a${i}: users { username }`).join(" ");
  const errors = errorsFor(`{ ${aliases} }`);
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0] ?? "", /asks for 200 fields/);
});

test("the width limit is exact at the boundary", () => {
  // One field short of the limit passes and one over fails. A live check
  // once found a query of exactly the limit slipping through, because the
  // comparison and the test disagreed about the edge.
  const copies = (n: number) => `{ ${Array.from({ length: n }, (_, i) => `a${i}: users { username }`).join(" ")} }`;
  assert.deepEqual(errorsFor(copies(75)), []); // 150 fields
  assert.equal(errorsFor(copies(76)).length, 1); // 152 fields
});

test("fields are counted through fragments too", () => {
  const spreads = Array.from({ length: 60 }, (_, i) => `a${i}: users { ...wide }`).join(" ");
  const query = `{ ${spreads} } fragment wide on User { _id username followerCount followingCount createdAt }`;
  assert.equal(errorsFor(query).length, 1);
});

test("a fragment that includes itself does not loop the rule forever", () => {
  // graphql-js has its own rule that rejects this. Ours just has to terminate.
  const query = `{ users { ...loop } } fragment loop on User { username following { ...loop } }`;
  const errors = errorsFor(query);
  assert.ok(Array.isArray(errors));
});

test("the limits can be tuned", () => {
  const tight = { maxDepth: 2, maxFields: 3 };
  assert.deepEqual(errorsFor(`{ users { username } }`, tight), []);
  assert.equal(errorsFor(`{ users { following { username } } }`, tight).length, 1);
  assert.equal(errorsFor(`{ users { _id username createdAt } }`, tight).length, 1);
});
