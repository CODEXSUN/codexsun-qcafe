import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { createViteDevelopmentServer } from "../../../../tools/vite-development.mjs";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: path.resolve(import.meta.dirname, "../../../../packages/ui/desk/public"),
  resolve: {
    alias: {
      "@/blocks/sidebar-08": path.resolve(import.meta.dirname, "../../../../packages/ui/desk/src/blocks/sidebar-08"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    ...createViteDevelopmentServer({ host: "127.0.0.1", port: 5173, proxy: { "/api/v1/zetro": "http://127.0.0.1:4150", "/api": "http://127.0.0.1:4100" } }),
    fs: { allow: [path.resolve(import.meta.dirname, "../../../..")] },
  },
});
