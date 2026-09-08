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
import { queryLimits } from "./utils/queryLimits.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const clientBuildDir = path.resolve(here, "../../client/dist");

async function start(): Promise<void> {
  // Connect first. The old server registered routes and only then waited for a
  // `db.once("open")` event, so a database that never connected left the process
  // running and silently answering nothing.
  await connectToDatabase();

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    // Stack traces leak file paths and package versions. Keep them in dev only.
    includeStacktraceInErrorResponses: !isProduction,
    // Refuse queries deep or wide enough to exhaust the process. See the rule
    // for the measurements that made this necessary.
    validationRules: [queryLimits()],
  });
  await apollo.start();

  const app = express();

  // Sit behind one proxy (Render, Fly, Heroku-style hosts) so that rate limiting
  // and secure cookies see the real client IP.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // The GraphQL explorer loads from a CDN and needs to frame itself, so the
      // policy is only applied to real deployments.
      contentSecurityPolicy: isProduction
        ? {
            useDefaults: true,
            directives: {
              // three's GLTFLoader unpacks the textures embedded in the axe
              // model into blob: URLs and then fetches them back. Helmet's
              // default `default-src 'self'` blocks that, which left the model
              // untextured and threw inside the canvas.
              "img-src": ["'self'", "data:", "blob:"],
              "connect-src": ["'self'", "blob:"],
              // Everything else stays at helmet's defaults, which is where the
              // useful part of the policy lives: no inline scripts, no plugins,
              // no framing by other sites.
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  // @types/compression still describes an Express 4 handler, so its type does not
  // line up with Express 5's app.use even though the middleware itself is fine.
  app.use(compression() as unknown as express.RequestHandler);

  // In development the Vite dev server proxies /graphql, so requests are
  // same-origin and CORS never applies. In production only the deployed client
  // is allowed to call the API from a browser.
  app.use(cors({ origin: isProduction ? env.CLIENT_ORIGIN : true, credentials: true }));

  // 1 MB, down from the old 50 MB. Builds are no longer whole-world JSON dumps.
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Signing up and logging in are the two endpoints worth brute-forcing, but
  // GraphQL puts everything on one URL, so the limit is applied per request and
  // sized to be invisible during normal use.
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
      }),
    }),
  );

  // Serve the built client only in production. In development Vite serves it,
  // and the old code's unconditional static handler shadowed the dev server.
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
