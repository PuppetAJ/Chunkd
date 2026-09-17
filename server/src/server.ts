import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";

import { env, isProduction } from "./config/env.ts";
import { connectToDatabase } from "./config/db.ts";
import { typeDefs, resolvers } from "./schemas/index.ts";
import { getUserFromAuthHeader, type GraphQLContext } from "./utils/auth.ts";
import { createLoaders } from "./utils/loaders.ts";
import { queryLimits } from "./utils/queryLimits.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const clientBuildDir = path.resolve(here, "../../client/dist");

async function start(): Promise<void> {
  // Connect first, so a database that never connects fails the boot instead of answering nothing.
  await connectToDatabase();

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    // Stack traces leak file paths and package versions. Keep them in dev only.
    includeStacktraceInErrorResponses: !isProduction,
    // Refuse queries deep or wide enough to exhaust the process.
    validationRules: [queryLimits()],
  });
  await apollo.start();

  const app = express();

  // Behind one proxy, so rate limiting sees the real client IP.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // The GraphQL explorer loads from a CDN and frames itself, so production only.
      contentSecurityPolicy: isProduction
        ? {
            useDefaults: true,
            directives: {
              // three's GLTFLoader unpacks embedded textures into blob: URLs and fetches them back.
              "img-src": ["'self'", "data:", "blob:"],
              "connect-src": ["'self'", "blob:"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  // @types/compression still describes an Express 4 handler, so its type does not
  // line up with Express 5's app.use even though the middleware itself is fine.
  app.use(compression() as unknown as express.RequestHandler);

  // In development Vite proxies /graphql, so CORS never applies.
  app.use(cors({ origin: isProduction ? env.CLIENT_ORIGIN : true, credentials: true }));

  // Must clear MAX_BUILD_BYTES plus a thumbnail plus the JSON around them, or
  // the build ceiling would never be reachable.
  app.use(express.json({ limit: "4mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // GraphQL puts everything on one URL, so the limit is per request and sized
  // to be invisible in normal use.
  const graphqlLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  app.use(
    "/graphql",
    graphqlLimiter,
    expressMiddleware(apollo, {
      context: async ({ req }): Promise<GraphQLContext> => ({
        user: getUserFromAuthHeader(req.headers.authorization),
        // Correct behind one proxy because of `trust proxy` above.
        ip: req.ip ?? "unknown",
        loaders: createLoaders(),
      }),
    }),
  );

  if (isProduction) {
    app.use(
      express.static(clientBuildDir, {
        // Vite fingerprints asset filenames, so they can be cached forever.
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    );

    // Anything that is not an API route or a real file is a client-side route.
    app.get(/(.*)/, (_req, res) => {
      res.sendFile(path.join(clientBuildDir, "index.html"));
    });
  }

  app.listen(env.PORT, () => {
    console.log(`API ready at http://localhost:${env.PORT}/graphql`);
  });
}

start().catch((error: unknown) => {
  console.error("Failed to start the server:", error);
  process.exit(1);
});
