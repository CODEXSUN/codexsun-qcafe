import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/server.ts", "src/backup.ts"],
  format: ["esm"],
  noExternal: ["@codexsun/zetro-api"],
  outDir: "dist",
  sourcemap: true,
});
