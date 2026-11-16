import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { forceLogOut, getAuthToken, isUnauthenticated } from "./auth.ts";

const httpLink = new HttpLink({ uri: "/graphql" });

const authLink = new SetContextLink((prevContext) => {
  const token = getAuthToken();
  return {
    headers: {
      ...prevContext.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = new ErrorLink(({ error }) => {
  if (isUnauthenticated(error)) forceLogOut();
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          thoughts: {
            keyArgs: ["username"],

            merge(existing: unknown[] = [], incoming: unknown[], { args }) {
              const merged = existing.slice();
              const offset = (args?.["offset"] as number | undefined) ?? 0;
              for (let index = 0; index < incoming.length; index += 1) {
                merged[offset + index] = incoming[index];
              }
              return merged;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});
