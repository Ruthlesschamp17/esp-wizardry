// Standalone SPA build for the Electron desktop shell.
// Bypasses the TanStack Start SSR pipeline — Electron loads a static index.html
// via file://, so we need base: './' and a plain client-only bundle.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  base: "./",
  root: path.resolve(__dirname, "electron/renderer"),
  plugins: [
    tsconfigPaths(),
    tanstackRouter({
      target: "react",
      routesDirectory: path.resolve(__dirname, "src/routes"),
      generatedRouteTree: path.resolve(__dirname, "src/routeTree.gen.ts"),
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist-electron/renderer"),
    emptyOutDir: true,
    target: "chrome120",
    sourcemap: false,
  },
});
