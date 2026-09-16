import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

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
    port: 3000,
    // Same-origin in development, so CORS and cookies behave as in production.
    proxy: {
      "/graphql": {
        // API_PORT points a second client at a second API.
        target: `http://localhost:${process.env["API_PORT"] ?? 3001}`,
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
