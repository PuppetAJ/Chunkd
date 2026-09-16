import {
  GraphQLError,
  type ASTVisitor,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
} from "graphql";

/**
 * How deep and how wide a query may be. `User.following` and `User.followers`
 * refer back to `User`, so nesting multiplies, and aliases run one query many
 * times over. Both limits sit well above anything the client sends.
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
  return (context: ValidationContext): ASTVisitor => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of context.getDocument().definitions) {
      if (definition.kind === "FragmentDefinition") {
        fragments.set(definition.name.value, definition);
      }
    }

    // Fragments are followed so they cannot hide nesting. `expanding` stops a
    // fragment that includes itself from looping forever.
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
          // The explorer's introspection queries would trip the limit in development.
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
