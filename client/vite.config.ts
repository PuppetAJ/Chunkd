import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Mirrors the "@/*" path alias in tsconfig.json so shadcn/ui's generated
  // components resolve at build time as well as during type checking.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // Vite copies known asset types through the build untouched. 3D models are
  // not on its default list, so importing the axe model has to be declared.
  assetsInclude: ["**/*.glb", "**/*.gltf"],

  server: {
    port: 3000,
    // Create React App had a "proxy" field in package.json for this. Sending
    // /graphql to the API keeps requests same-origin in development, so CORS
    // and cookies behave the same way they do in production.
    proxy: {
      "/graphql": {
        // API_PORT points a second client at a second API, for running one
        // branch beside another.
        target: `http://localhost:${process.env["API_PORT"] ?? 3001}`,
        changeOrigin: true,
      },
    },
  },

  build: {
    // Source maps ship the original source to anyone who asks for them. That
    // is a deliberate choice here: the repository is public, so the maps give
    // away nothing, and they make a production stack trace readable.
    sourcemap: true,
  },
});
