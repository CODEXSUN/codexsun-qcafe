import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createViteDevelopmentServer } from "../../../tools/vite-development.mjs";

export default defineConfig({
  publicDir: path.resolve(import.meta.dirname, "../../ui/desk/public"),
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react-runtime", test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 40 },
            { name: "radix-ui", test: /node_modules[\\/]@radix-ui[\\/]/, priority: 35 },
            { name: "tanstack-query", test: /node_modules[\\/]@tanstack[\\/]/, priority: 35 },
            { name: "icons", test: /node_modules[\\/]lucide-react[\\/]/, priority: 30 },
            { name: "shared-ui", test: /packages[\\/]ui(?:[\\/]|$)/, priority: 20 },
            { name: "topology", test: /packages[\\/]devkit-ito[\\/]/, priority: 20 },
            { name: "vendor", test: /node_modules[\\/]/, minSize: 20_000, maxSize: 220_000, priority: 10 },
            { name: "common", minShareCount: 2, minSize: 10_000, priority: 5 },
          ],
        },
      },
    },
  },
  server: createViteDevelopmentServer({ host: "127.0.0.1", port: 5175, proxy: { "/api": "http://127.0.0.1:4150" } }),
});
