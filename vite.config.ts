import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors tsconfig "paths": { "@/*": ["src/*"] }. A root-relative path is resolved
      // by Vite against the project root, so no Node `path` / `__dirname` is needed
      // (and no @types/node) — this file stays type-checkable under tsconfig.node.json.
      "@": "/src",
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
