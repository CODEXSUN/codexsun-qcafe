import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createViteDevelopmentServer } from "../../../tools/vite-development.mjs";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: createViteDevelopmentServer({ host: "127.0.0.1", port: 5174 }),
});
