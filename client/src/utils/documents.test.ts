import assert from "node:assert/strict";
import test from "node:test";
import { buildSchema, validate, type DocumentNode } from "graphql";

import { DEMO_USERNAME as SERVER_DEMO_USERNAME } from "../../../server/src/config/demo.ts";
import { typeDefs } from "../../../server/src/schemas/typeDefs.ts";
import { DEMO_USERNAME } from "../lib/feedTypes.ts";
import * as mutations from "./mutations.ts";
import * as queries from "./queries.ts";

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

test("the client and the server name the same demo account", () => {
  assert.equal(DEMO_USERNAME, SERVER_DEMO_USERNAME);
});
