import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createViteDevelopmentServer } from "../../../tools/vite-development.mjs";

export default defineConfig({
  publicDir: path.resolve(import.meta.dirname, "../../ui/desk/public"),
  plugins: [react(), tailwindcss()],
  server: createViteDevelopmentServer({ host: "127.0.0.1", port: 5175, proxy: { "/api": "http://127.0.0.1:4150" } }),
});
