import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { settingsSchema, type ZetroSettings } from "./workspace-contracts.js";

/** Single-process local configuration. Secrets belong in the environment. */
export class JsonSettingsStore {
  constructor(private readonly file: string) {}
  exists() { return existsSync(this.file); }
  read(): ZetroSettings { return settingsSchema.parse(JSON.parse(readFileSync(this.file, "utf8"))); }
  write(value: ZetroSettings) {
    const settings = settingsSchema.parse(value);
    mkdirSync(dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, this.file);
  }
}
