import {
  GraphQLError,
  type ASTVisitor,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
} from "graphql";

/**
 * Refuse queries that are too deep or too wide before they run.
 *
 * `User.following` and `User.followers` refer back to `User`, so a query can
 * nest them as far as it likes. Each level asks the database about every user
 * the level above returned, which multiplies. Measured against a production
 * build: depth 5 took two seconds and returned three megabytes, depth 6 took
 * ten seconds and fifteen megabytes, and depth 7 killed the process with the
 * JavaScript heap exhausted. One request, no account needed.
 *
 * Depth alone is not enough, because a query can also be wide: a hundred
 * aliased copies of a permitted query run in parallel and cost a hundred times
 * as much. So the number of fields is capped as well.
 *
 * Both limits sit well above anything the client sends. The deepest real query
 * is four levels and the widest is about twenty-six fields.
 */
export interface QueryLimits {
  maxDepth: number;
  maxFields: number;
}

export const DEFAULT_QUERY_LIMITS: QueryLimits = { maxDepth: 6, maxFields: 150 };

/** What one walk over a selection set found. */
interface Measurement {
  depth: number;
  fields: number;
}

export function queryLimits(limits: QueryLimits = DEFAULT_QUERY_LIMITS) {
  // A validation rule is a function that is handed the document being checked
  // and returns a visitor: an object whose keys name the kinds of node to look
  // at. This one only looks at whole operations, and measures each one.
  return (context: ValidationContext): ASTVisitor => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of context.getDocument().definitions) {
      if (definition.kind === "FragmentDefinition") {
        fragments.set(definition.name.value, definition);
      }
    }

    // Walk a selection set, returning how deep it goes and how many fields it
    // holds. Fragments are followed so they cannot be used to hide nesting.
    // `expanding` is the set of fragments already being followed on this
    // path, which stops a fragment that includes itself from looping forever.
    // (A separate built-in rule rejects such a query anyway.)
    function measure(
      selectionSet: SelectionSetNode | undefined,
      depth: number,
      expanding: Set<string>,
    ): Measurement {
      if (!selectionSet) return { depth, fields: 0 };

      let deepest = depth;
      let fields = 0;

      for (const selection of selectionSet.selections) {
        if (selection.kind === "Field") {
          // Introspection fields are refused separately in production, and in
          // development the explorer's own queries would trip the limit.
          if (selection.name.value.startsWith("__")) continue;
          fields += 1;
          const inner = measure(selection.selectionSet, depth + 1, expanding);
          deepest = Math.max(deepest, inner.depth);
          fields += inner.fields;
        } else if (selection.kind === "InlineFragment") {
          const inner = measure(selection.selectionSet, depth, expanding);
          deepest = Math.max(deepest, inner.depth);
          fields += inner.fields;
        } else {
          const name = selection.name.value;
          const fragment = fragments.get(name);
          if (!fragment || expanding.has(name)) continue;
          const next = new Set(expanding);
          next.add(name);
          const inner = measure(fragment.selectionSet, depth, next);
          deepest = Math.max(deepest, inner.depth);
          fields += inner.fields;
        }
      }

      return { depth: deepest, fields };
    }

    return {
      OperationDefinition(node) {
        const { depth, fields } = measure(node.selectionSet, 0, new Set());

        if (depth > limits.maxDepth) {
          context.reportError(
            new GraphQLError(
              `This query is nested ${depth} levels deep. The limit is ${limits.maxDepth}.`,
              { nodes: [node], extensions: { code: "QUERY_TOO_DEEP" } },
            ),
          );
        }

        if (fields > limits.maxFields) {
          context.reportError(
            new GraphQLError(
              `This query asks for ${fields} fields. The limit is ${limits.maxFields}.`,
              { nodes: [node], extensions: { code: "QUERY_TOO_WIDE" } },
            ),
          );
        }
      },
    };
  };
}
