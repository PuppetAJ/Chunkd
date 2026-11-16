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

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  assetsInclude: ["**/*.glb", "**/*.gltf"],

  server: {
    port: clientPort,
    strictPort: true,
    proxy: {
      "/graphql": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },

  build: {
    sourcemap: true,
  },
});
