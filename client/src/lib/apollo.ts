import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { forceLogOut, getAuthToken } from "./auth.ts";

// Vite proxies /graphql to the API in development, so this stays a relative
// path in both environments and no CORS preflight is needed.
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

// A token that has expired while the tab was open used to fail silently and
// leave the page stuck on a loading state. Clear it instead, so the UI falls
// back to the logged-out view.
const errorLink = new ErrorLink(({ error }) => {
  const unauthenticated =
    error &&
    typeof error === "object" &&
    "graphQLErrors" in error &&
    Array.isArray(error.graphQLErrors) &&
    error.graphQLErrors.some(
      (graphQLError) => graphQLError?.extensions?.["code"] === "UNAUTHENTICATED",
    );

  if (unauthenticated) forceLogOut();
});

export const apolloClient = new ApolloClient({
  // Requests travel down this list in order: error handling, then the auth
  // header, then the actual HTTP call.
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      // Show what is cached immediately, then refresh from the network.
      fetchPolicy: "cache-and-network",
    },
  },
});
