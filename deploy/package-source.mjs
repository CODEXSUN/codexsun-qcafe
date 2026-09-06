import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync(".local", { recursive: true });
const files = [...new Set(execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8", maxBuffer: 32_000_000 }).trim().split("\n"))]
  .filter(file => /^(apps|packages|tools|assist|deploy)\//.test(file) || ["package.json", "package-lock.json", "tsconfig.base.json", ".dockerignore"].includes(file))
  .filter(file => !/(^|\/)\.env|\.env$|(^|\/)(state|backups|node_modules|target|dist)\//.test(file))
  .filter(file => /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html|svg|md|mdx|py|sh|toml|yml|yaml|conf)$/.test(file) || /Dockerfile|\.dockerignore$/.test(file));
writeFileSync(".local/cloud-source-files.txt", files.join("\n") + "\n");
execFileSync("tar", ["-czf", ".local/codexsun-cloud-source.tgz", "-T", ".local/cloud-source-files.txt"]);
console.log(`Packaged ${files.length} source files; ignored runtime state and credentials are excluded.`);
