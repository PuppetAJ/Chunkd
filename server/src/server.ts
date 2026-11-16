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
import { useDatabase } from "./config/db.ts";
import { typeDefs, resolvers } from "./schemas/index.ts";
import { getUserFromAuthHeader, type GraphQLContext } from "./utils/auth.ts";
import { createLoaders } from "./utils/loaders.ts";
import { queryLimits } from "./utils/queryLimits.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const clientBuildDir = path.resolve(here, "../../client/dist");

async function start(): Promise<void> {
  await useDatabase();

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    includeStacktraceInErrorResponses: !isProduction,
    validationRules: [queryLimits()],
  });
  await apollo.start();

  const app = express();

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

  app.use(cors({ origin: isProduction ? env.CLIENT_ORIGIN : true, credentials: true }));

  app.use(express.json({ limit: "4mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const graphqlLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  app.use(
    "/graphql",
    graphqlLimiter,
    async (_req, _res, next) => {
      await useDatabase();
      next();
    },
    expressMiddleware(apollo, {
      context: async ({ req }): Promise<GraphQLContext> => ({
        user: getUserFromAuthHeader(req.headers.authorization),
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
