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
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },

  build: {
    // Source maps make a production stack trace readable without shipping
    // the original source to the browser on every page load.
    sourcemap: true,
  },
});
