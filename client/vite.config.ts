import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const apiPort = process.env["API_PORT"] ?? process.env["PORT"] ?? 3001;
const clientPort = Number(new URL(process.env["CLIENT_ORIGIN"] ?? "http://localhost:3000").port || 3000);

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Mirrors the "@/*" alias in tsconfig.json for shadcn/ui's components.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // 3D models are not on Vite's default asset list.
  assetsInclude: ["**/*.glb", "**/*.gltf"],

  server: {
    port: clientPort,
    strictPort: true,
    // Same-origin in development, so CORS and cookies behave as in production.
    proxy: {
      "/graphql": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },

  build: {
    // The repository is public, so source maps give away nothing and make
    // production stack traces readable.
    sourcemap: true,
  },
});
