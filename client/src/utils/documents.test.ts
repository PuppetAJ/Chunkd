import assert from "node:assert/strict";
import test from "node:test";
import { buildSchema, validate, type DocumentNode } from "graphql";

import { typeDefs } from "../../../server/src/schemas/typeDefs.ts";
import * as mutations from "./mutations.ts";
import * as queries from "./queries.ts";

// Checks every document the client sends against the server's schema, so a
// field that no longer exists fails here instead of in the browser.
const schema = buildSchema(typeDefs);

for (const [name, document] of Object.entries({ ...queries, ...mutations })) {
  test(`${name} only asks for what the schema has`, () => {
    const problems = validate(schema, document as DocumentNode);
    assert.deepEqual(
      problems.map((problem) => problem.message),
      [],
    );
  });
}
