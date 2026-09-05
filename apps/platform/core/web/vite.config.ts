import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { createViteDevelopmentServer } from "../../../../tools/vite-development.mjs";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: path.resolve(import.meta.dirname, "../../../../packages/ui/desk/public"),
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react-runtime", test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 40 },
            { name: "radix-ui", test: /node_modules[\\/]@radix-ui[\\/]/, priority: 35 },
            { name: "tanstack-query", test: /node_modules[\\/]@tanstack[\\/]/, priority: 35 },
            { name: "mermaid", test: /node_modules[\\/]mermaid[\\/]/, priority: 34 },
            { name: "icons", test: /node_modules[\\/]lucide-react[\\/]/, priority: 30 },
            { name: "zetro-workspace", test: /packages[\\/]zetro[\\/]web[\\/]/, priority: 25 },
            { name: "chat-workspace", test: /packages[\\/]chat[\\/]web[\\/]/, priority: 25 },
            { name: "task-workspace", test: /packages[\\/]ai-task-system[\\/]web[\\/]/, priority: 25 },
            { name: "docs-workspace", test: /apps[\\/]docs[\\/]web[\\/]/, priority: 25 },
            { name: "device-chat", test: /packages[\\/]dcs[\\/]web[\\/]/, priority: 25 },
            { name: "platform-ui", test: /packages[\\/]ui(?:[\\/]|$)/, priority: 20 },
            { name: "topology", test: /packages[\\/]devkit-ito[\\/]/, priority: 20 },
            { name: "vendor", test: /node_modules[\\/]/, minSize: 20_000, maxSize: 220_000, priority: 10 },
            { name: "common", minShareCount: 2, minSize: 10_000, priority: 5 },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@/blocks/sidebar-08": path.resolve(import.meta.dirname, "../../../../packages/ui/desk/src/blocks/sidebar-08"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    ...createViteDevelopmentServer({ host: "127.0.0.1", port: 5173, proxy: { "/api/v1/docs": "http://127.0.0.1:4185", "/api/v1/zetro": "http://127.0.0.1:4150", "/api/v1/ai-tasks": "http://127.0.0.1:4150", "/dcs": { target: "http://127.0.0.1:4170", ws: true }, "/api": "http://127.0.0.1:4100" } }),
    fs: { allow: [path.resolve(import.meta.dirname, "../../../..")] },
  },
});
