import { z } from "zod";

// Every environment variable the server needs, described in one place.
//
// The old server had the JWT secret hard-coded in the source and read the Mongo
// URL inline with a fallback. This schema replaces both: the process refuses to
// start if anything required is missing, so a misconfigured deploy fails loudly
// at boot instead of quietly signing tokens with a public secret.
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    // The example file's stand-in value is 34 characters, so it satisfied the
    // length check. A deploy that copied .env.example without editing it would
    // have signed every token with a secret that is public on GitHub.
    .refine((value) => !/replace-me|changeme|change-me|example|secret-here/i.test(value), {
      message: "JWT_SECRET is still the placeholder from .env.example. Generate a real one.",
    }),

  JWT_EXPIRES_IN: z.string().default("2h"),

  PORT: z.coerce.number().int().positive().default(3001),

  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
});

// `z.infer` reads the shape back out of the schema above, so the type and the
// validation can never drift apart.
export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error(
      `\nCannot start: the environment is not configured correctly.\n\n${problems}\n\n` +
        `Copy .env.example to .env at the repo root and fill it in.\n`,
    );
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";

// Running on a host without NODE_ENV=production opens four things at once:
// the content security policy switches off, CORS reflects any origin, error
// responses carry stack traces, and introspection is on. That is one missing
// variable away, and nothing else would notice. Railway sets this variable on
// every deployment, so its presence is a reliable way to tell a real host from
// a laptop.
if (process.env.RAILWAY_ENVIRONMENT && !isProduction) {
  console.error(
    `\nCannot start: this looks like a Railway deployment but NODE_ENV is ` +
      `"${env.NODE_ENV}". Set NODE_ENV=production on the service.\n`,
  );
  process.exit(1);
}
