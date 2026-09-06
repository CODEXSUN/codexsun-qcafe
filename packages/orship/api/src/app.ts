import cors from "@fastify/cors";
import { readFileSync } from "node:fs";
import Fastify from "fastify";
import { resolve } from "node:path";
import { cloudReleaseStateSchema } from "@codexsun/orship-contracts";
import { ReleaseOperationService } from "./application/release-operation-service.js";
import { ReleaseHistoryService } from "./application/release-history-service.js";
import { registerReleaseOperationRoutes } from "./http/routes.js";
import { MemoryReleaseEventPublisher } from "./infrastructure/memory-release-event-publisher.js";
import { SqliteReleaseOperationRepository } from "./infrastructure/sqlite-release-operation-repository.js";

export function buildOrshipApp(options: { databaseFile?: string; cloudStateFile?: string } = {}) {
  const app = Fastify({ logger: true });
  void app.register(cors, { credentials: true, origin: ["http://127.0.0.1:5173", "http://127.0.0.1:5175", "http://tauri.localhost", "https://tauri.localhost", "tauri://localhost"] });
  app.get("/health", async () => ({ service: "orship", status: "ok" }));
  const file = options.databaseFile ?? process.env.ORSHIP_DATABASE_FILE ?? resolve(import.meta.dirname, "../state/orship.db");
  const repository = new SqliteReleaseOperationRepository(file);
  registerReleaseOperationRoutes(app, new ReleaseOperationService(repository, new MemoryReleaseEventPublisher()), new ReleaseHistoryService(repository));
  const cloudStateFile = options.cloudStateFile ?? process.env.ORSHIP_CLOUD_STATE_FILE;
  app.get("/api/v1/orship/cloud-state", async () => readCloudState(cloudStateFile));
  return app;
}

function readCloudState(file: string | undefined) {
  if (!file) return null;
  try { return cloudReleaseStateSchema.parse(JSON.parse(readFileSync(file, "utf8"))); } catch { return null; }
}
