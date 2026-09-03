import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/server.ts"],
  format: ["esm"],
  noExternal: ["@codexsun/contracts", "@codexsun/runtime"],
  outDir: "dist",
  sourcemap: true,
});
