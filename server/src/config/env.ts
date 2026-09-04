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
    .min(32, "JWT_SECRET must be at least 32 characters"),

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
