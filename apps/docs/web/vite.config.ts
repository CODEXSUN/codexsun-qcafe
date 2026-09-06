import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: path.resolve(import.meta.dirname, "../../../packages/ui/desk/public"),
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react-runtime", test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 40 },
            { name: "radix-ui", test: /node_modules[\\/]@radix-ui[\\/]/, priority: 35 },
            { name: "mermaid", test: /node_modules[\\/]mermaid[\\/]/, priority: 34 },
            { name: "icons", test: /node_modules[\\/]lucide-react[\\/]/, priority: 30 },
            { name: "docs-ui", test: /packages[\\/]ui(?:[\\/]|$)/, priority: 20 },
          ],
        },
      },
    },
  },
  server: { host: "127.0.0.1", port: 5185, strictPort: true, proxy: { "/api/v1/docs": "http://127.0.0.1:4185" } },
});
