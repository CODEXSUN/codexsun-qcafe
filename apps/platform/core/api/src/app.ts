import cors from "@fastify/cors";
import { registerVps } from "./modules/vps/index.js";
import Fastify from "fastify";
import { PlatformCore } from "@codexsun/runtime";
import { platformManifests } from "./manifests.js";
import { installedApplications } from "./applications.js";
import { registerPlatformOwnership, validatePlatformManifestOwnership } from "./ownership.js";
import { readPersistenceEnvironment } from "./database/config.js";
import { PlatformPersistence, type PlatformPersistenceLifecycle } from "./database/persistence.js";
import { IdentityHostAdapter, requireAuthorization } from "./auth/host-auth.js";
import { createIdentityModule, KyselyIdentityRepository, PlatformIdentityEventPublisher, registerIdentityRoutes, seedIdentity, IdentityService, staticTokenKeyResolver } from "./modules/identity/index.js";
import { AppRegistryService, KyselyAppRegistryRepository, MemoryAppRegistryRepository, PlatformAppRegistryEventPublisher, MemoryAppRegistryEventPublisher, registerAppRegistryRoutes, seedAppRegistry } from "./modules/app-registry/index.js";
import { PlatformOutboxQueue } from "./queue/outbox-queue.js";

export function buildApp(options: {
  applications?: ReturnType<typeof installedApplications>;
  environment?: NodeJS.ProcessEnv;
  identity?: IdentityService;
  persistence?: PlatformPersistenceLifecycle;
} = {}) {
  const app = Fastify({ logger: true });
  registerVps(app, options.environment ?? process.env);
  const core = new PlatformCore();
  const applications = options.applications ?? installedApplications();
  registerPlatformOwnership(core);
  validatePlatformManifestOwnership(core, platformManifests);
  const environment = readPersistenceEnvironment(options.environment);
  if (environment.databaseRequired && !environment.database) {
    throw new Error("DATABASE_URL is required when OS_DATABASE_REQUIRED=true.");
  }
  const persistence = options.persistence ?? (environment.database ? new PlatformPersistence(environment.database) : undefined);
  const outboxQueue = new PlatformOutboxQueue(environment.redisUrl);
  const identity = options.identity ?? (persistence instanceof PlatformPersistence && environment.identityTokenSecret
    ? new IdentityService(new KyselyIdentityRepository(persistence.database), staticTokenKeyResolver(environment.identityTokenSecret), new PlatformIdentityEventPublisher(persistence), {
      enabled: (options.environment ?? process.env).OS_FIRST_LOGIN_SETUP === "true",
      login: (options.environment ?? process.env).OS_SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? "",
      bootstrapPassword: (options.environment ?? process.env).OS_SUPER_ADMIN_PASSWORD ?? "",
      code: (options.environment ?? process.env).OS_FIRST_LOGIN_SETUP_CODE ?? "",
      expiresAt: (options.environment ?? process.env).OS_FIRST_LOGIN_SETUP_EXPIRES_AT ?? "",
    }, {
      enabled: (options.environment ?? process.env).OS_PASSWORD_RESET === "true",
      code: (options.environment ?? process.env).OS_PASSWORD_RESET_CODE ?? "",
      expiresAt: (options.environment ?? process.env).OS_PASSWORD_RESET_EXPIRES_AT ?? "",
    })
    : undefined);
  for (const manifest of [...platformManifests, ...applications]) {
    core.framework.register(identity && manifest.id === "platform.identity" ? createIdentityModule(identity) : manifest);
  }
  core.registry.validateDependencies();
  app.addHook("onReady", async () => {
    await persistence?.start();
    if (persistence instanceof PlatformPersistence) {
      await seedIdentity(persistence.database, options.environment ?? process.env);
      await seedAppRegistry(new KyselyAppRegistryRepository(persistence.database), options.environment ?? process.env);
    }
    await core.framework.start();
    if (persistence) {
      const payload = { modules: core.snapshot().modules.map((module) => module.id) };
      const event = await persistence.recordEvent({
        payload,
        topic: "platform.lifecycle",
        type: "platform.started",
      });
      await outboxQueue.publish({ id: event.outboxId, payload, topic: "platform.lifecycle" });
    }
  });
  app.addHook("onClose", async () => {
    await core.framework.stop();
    await outboxQueue.stop();
    await persistence?.stop();
  });
  void app.register(cors, {
    credentials: true,
    origin: [
      "https://os.codexsun.com",
      "http://tauri.localhost",
      "https://tauri.localhost",
      "tauri://localhost",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
    ],
  });
  const host = identity ? new IdentityHostAdapter(identity) : undefined;
  const appRegistryRepo = persistence instanceof PlatformPersistence
    ? new KyselyAppRegistryRepository(persistence.database)
    : new MemoryAppRegistryRepository();
  const appRegistryPublisher = persistence
    ? new PlatformAppRegistryEventPublisher(persistence)
    : new MemoryAppRegistryEventPublisher();
  const appRegistry = new AppRegistryService(
    [...platformManifests, ...applications],
    appRegistryRepo,
    appRegistryPublisher,
    undefined,
    false,
    persistence ? "mysql" : "sqlite"
  );
  registerAppRegistryRoutes(app, appRegistry, host);

  if (identity && host) {
    registerIdentityRoutes(app, identity);
    app.get("/api/v1/apps/:applicationId/context", { preHandler: requireAuthorization(host, "app.access") }, async (request) => {
      const applicationId = (request.params as { applicationId: string }).applicationId;
      const token = request.headers.authorization?.slice("Bearer ".length) ?? "";
      const context = await host.authenticate(token);
      if (!context.actor.applicationIds.includes(applicationId)) return { available: false };
      return { actor: context.actor, available: true, scope: context.scope, tenantId: context.tenantId };
    });
  }
  app.get("/health", async () => ({ database: persistence ? "configured" : "disabled", redis: environment.redisUrl ? "configured" : "disabled", status: "ok" }));
  app.get("/api/v1/core", async () => core.snapshot());
  return app;
}
