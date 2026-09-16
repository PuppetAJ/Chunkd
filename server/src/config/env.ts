import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    // The placeholder in .env.example passes the length check, so refuse it by name.
    .refine((value) => !/replace-me|changeme|change-me|example|secret-here/i.test(value), {
      message: "JWT_SECRET is still the placeholder from .env.example. Generate a real one.",
    }),

  JWT_EXPIRES_IN: z.string().default("2h"),

  PORT: z.coerce.number().int().positive().default(3001),

  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
});

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

// A deploy without NODE_ENV=production runs with the CSP off, CORS open, stack
// traces in responses and introspection on. Railway sets this on every deployment.
if (process.env.RAILWAY_ENVIRONMENT && !isProduction) {
  console.error(
    `\nCannot start: this looks like a Railway deployment but NODE_ENV is ` +
      `"${env.NODE_ENV}". Set NODE_ENV=production on the service.\n`,
  );
  process.exit(1);
}
