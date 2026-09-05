import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import type { ModuleManifest } from "@codexsun/contracts";
import type { PlatformHostAdapter, PlatformHostContext } from "@codexsun/platform-host-contracts";
import { AppRegistryService } from "./app-registry.service.js";
import { MemoryAppRegistryRepository } from "./app-registry.repository.js";
import { MemoryAppRegistryEventPublisher } from "./app-registry.events.js";
import { registerAppRegistryRoutes } from "./app-registry.routes.js";

const testManifests: ModuleManifest[] = [
  {
    capabilities: ["desired-state"],
    dependencies: [],
    description: "Platform core",
    id: "platform.core",
    kind: "platform",
    name: "Platform Core",
    runtime: "node",
    version: "0.1.0",
  },
  {
    capabilities: ["developer-tools"],
    dependencies: ["platform.core"],
    description: "Developer workspace",
    id: "app.devkit",
    kind: "application",
    name: "DevKit",
    runtime: "static",
    version: "0.1.1",
    webUrl: "http://127.0.0.1:5174",
  },
];

class MockHostAdapter implements PlatformHostAdapter {
  constructor(private readonly mockContext?: PlatformHostContext) {}

  async authenticate(bearerToken: string): Promise<PlatformHostContext> {
    if (bearerToken === "valid-admin-token") {
      return {
        actor: {
          applicationIds: ["app.devkit", "platform.core"],
          id: "admin-user",
          permissions: ["app-registry.admin", "app.access"],
          sessionId: "sess-admin",
        },
        scope: "single-client",
      };
    }
    if (bearerToken === "regular-user-token") {
      return {
        actor: {
          applicationIds: ["app.devkit"],
          id: "regular-user",
          permissions: ["app.access"],
          sessionId: "sess-user",
        },
        scope: "single-client",
      };
    }
    throw new Error("Invalid token");
  }

  authorize(context: PlatformHostContext, permission: string): boolean {
    return context.actor.permissions.includes(permission);
  }
}

describe("App Registry Routes", () => {
  it("allows anonymous read access to /api/v1/registry", async () => {
    const app = Fastify();
    const repository = new MemoryAppRegistryRepository();
    const eventPublisher = new MemoryAppRegistryEventPublisher();
    const service = new AppRegistryService(testManifests, repository, eventPublisher);
    const host = new MockHostAdapter();

    registerAppRegistryRoutes(app, service, host);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/registry",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.applications.length).toBeGreaterThanOrEqual(1);
    expect(json.applications.find((a: { id: string }) => a.id === "app.devkit")).toBeDefined();
    await app.close();
  });

  it("returns 401 when unauthenticated user attempts mutation", async () => {
    const app = Fastify();
    const repository = new MemoryAppRegistryRepository();
    const eventPublisher = new MemoryAppRegistryEventPublisher();
    const service = new AppRegistryService(testManifests, repository, eventPublisher);
    const host = new MockHostAdapter();

    registerAppRegistryRoutes(app, service, host);

    const response = await app.inject({
      method: "POST",
      payload: { enabled: false },
      url: "/api/v1/registry/apps/app.devkit/state",
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("returns 403 when authenticated user lacks app-registry.admin permission", async () => {
    const app = Fastify();
    const repository = new MemoryAppRegistryRepository();
    const eventPublisher = new MemoryAppRegistryEventPublisher();
    const service = new AppRegistryService(testManifests, repository, eventPublisher);
    const host = new MockHostAdapter();

    registerAppRegistryRoutes(app, service, host);

    const response = await app.inject({
      headers: { authorization: "Bearer regular-user-token" },
      method: "POST",
      payload: { enabled: false },
      url: "/api/v1/registry/apps/app.devkit/state",
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("permits authorized admin to update state and records audit event", async () => {
    const app = Fastify();
    const repository = new MemoryAppRegistryRepository();
    const eventPublisher = new MemoryAppRegistryEventPublisher();
    const service = new AppRegistryService(testManifests, repository, eventPublisher);
    const host = new MockHostAdapter();

    registerAppRegistryRoutes(app, service, host);

    const response = await app.inject({
      headers: { authorization: "Bearer valid-admin-token" },
      method: "POST",
      payload: { enabled: false },
      url: "/api/v1/registry/apps/app.devkit/state",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.state).toBe("disabled");
    expect(json.runtimeStatus).toBe("stopped");

    // Verify audit event published
    expect(eventPublisher.events.length).toBe(1);
    const event = eventPublisher.events[0]!;
    expect(event.type).toBe("registry.app.state_changed");
    expect(event.applicationId).toBe("app.devkit");
    expect(event.actorId).toBe("admin-user");

    await app.close();
  });
});
