import { build } from "esbuild";

for (const [name, entry] of Object.entries({ platform: "apps/platform/core/api/src/server.ts", zetro: "packages/zetro/api/src/server.ts", chat: "packages/chat/api/src/cloud-server.ts" })) {
  await build({ entryPoints: [entry], outfile: `deploy/build/${name}.mjs`, bundle: true, platform: "node", format: "esm", target: "node24", sourcemap: true,
    plugins: [{ name: "external-npm", setup(builder) { builder.onResolve({ filter: /^[^./]|^@/ }, args => {
      if (args.kind !== "entry-point" && !args.path.startsWith("@codexsun/") && !args.path.startsWith("E:") && !args.path.startsWith("C:")) return { path: args.path, external: true };
    }); } }],
  });
}
