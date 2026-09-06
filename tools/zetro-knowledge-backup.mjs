import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const command = process.argv[2]; const target = process.argv[3] ? resolve(process.argv[3]) : resolve("backups", `zetro-knowledge-${new Date().toISOString().slice(0, 10)}`);
const state = resolve("packages/zetro/api/state"); const vault = join(state, "vault"); const database = join(state, "knowledge.db");
if (!['backup', 'restore'].includes(command)) throw new Error("Use backup or restore, optionally followed by a folder.");
if (command === 'backup') { mkdirSync(target, { recursive: true }); if (existsSync(vault)) cpSync(vault, join(target, "vault"), { recursive: true }); if (existsSync(database)) cpSync(database, join(target, "knowledge.db")); const manifest = { schemaVersion: 1, createdAt: new Date().toISOString(), files: existsSync(database) ? [{ name: "knowledge.db", sha256: createHash("sha256").update(readFileSync(database)).digest("hex") }] : [], excludes: [".env", "provider tokens", "device authorization", "Docker volumes"] }; writeFileSync(join(target, "manifest.json"), JSON.stringify(manifest, null, 2)); console.log(`Knowledge backup created: ${target}`); }
else { const manifest = JSON.parse(readFileSync(join(target, "manifest.json"), "utf8")); if (manifest.schemaVersion !== 1) throw new Error("Unsupported knowledge backup schema."); mkdirSync(state, { recursive: true }); if (existsSync(join(target, "vault"))) cpSync(join(target, "vault"), vault, { recursive: true, force: true }); if (existsSync(join(target, "knowledge.db"))) cpSync(join(target, "knowledge.db"), database, { force: true }); console.log(`Knowledge backup restored: ${target}`); }
