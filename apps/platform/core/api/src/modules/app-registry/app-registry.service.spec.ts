import { describe, expect, it } from "vitest";
import type { ModuleManifest } from "@codexsun/contracts";
import { AppRegistryService } from "./app-registry.service.js";
import { MemoryAppRegistryRepository } from "./app-registry.repository.js";
import { MemoryAppRegistryEventPublisher } from "./app-registry.events.js";

const testManifests: ModuleManifest[] = [
  {
    capabilities: ["desired-state", "deployments"],
    dependencies: [],
    description: "Platform core",
    id: "platform.core",
    kind: "platform",
    name: "Platform Core",
    runtime: "node",
    version: "0.1.0",
  },
  {
    capabilities: ["credentials", "sessions"],
    dependencies: ["platform.core"],
    description: "Platform identity",
    id: "platform.identity",
    kind: "platform",
    name: "Platform Identity",
    runtime: "node",
    version: "0.1.0",
  },
  {
    capabilities: ["developer-tools"],
    dependencies: ["platform.core"],
    description: "Developer tools and workspace",
    id: "app.devkit",
    kind: "application",
    name: "DevKit",
    runtime: "static",
    version: "0.1.1",
    webUrl: "http://127.0.0.1:5174",
  },
  {
    capabilities: ["conversations"],
    dependencies: ["platform.core", "platform.identity"],
    description: "Agent workspace",
    id: "app.zetro",
    kind: "application",
    name: "Zetro",
    runtime: "static",
    version: "0.1.1",
    webUrl: "http://127.0.0.1:5175",
  },
];

describe("AppRegistryService", () => {
  it("projects manifests into application summaries with declared owners", async () => {
    const repository = new MemoryAppRegistryRepository();
    const eventPublisher = new MemoryAppRegistryEventPublisher();
    const service = new AppRegistryService(testManifests, repository, eventPublisher);

    const overview = await service.getOverview();
    expect(overview.applications.length).toBeGreaterThanOrEqual(2);

    const devkit = overview.applications.find((app) => app.id === "app.devkit");
    expect(devkit).toBeDefined();
    expect(devkit!.name).toBe("DevKit");
    expect(devkit!.owner).toBe("DevKit");
    expect(devkit!.state).toBe("active");
    expect(devkit!.runtimeStatus).toBe("running");
  });

  it("calculates reverse dependencies correctly", async () => {
    const service = new AppRegistryService(
      testManifests,
      new MemoryAppRegistryRepository(),
      new MemoryAppRegistryEventPublisher()
    );

    const reverseDepsOfCore = service.findReverseDependencies("platform.core");
    expect(reverseDepsOfCore).toContain("platform.identity");
    expect(reverseDepsOfCore).toContain("app.devkit");
    expect(reverseDepsOfCore).toContain("app.zetro");

    const reverseDepsOfIdentity = service.findReverseDependencies("platform.identity");
    expect(reverseDepsOfIdentity).toContain("app.zetro");
    expect(reverseDepsOfIdentity).not.toContain("app.devkit");
  });

  it("detects missing dependencies and cyclic dependencies", () => {
    const cyclicManifests: ModuleManifest[] = [
      {
        capabilities: [],
        dependencies: ["module.b"],
        description: "A",
        id: "module.a",
        kind: "application",
        name: "A",
        runtime: "node",
        version: "1.0.0",
      },
      {
        capabilities: [],
        dependencies: ["module.a", "module.missing"],
        description: "B",
        id: "module.b",
        kind: "application",
        name: "B",
        runtime: "node",
        version: "1.0.0",
      },
    ];

    const service = new AppRegistryService(
      cyclicManifests,
      new MemoryAppRegistryRepository(),
      new MemoryAppRegistryEventPublisher()
    );

    const validation = service.validateDependencies();
    expect(validation.missing).toEqual([{ from: "module.b", missingDependency: "module.missing" }]);
    expect(validation.cyclic.length).toBeGreaterThan(0);
  });

  it("enforces that manifest declarations remain authoritative over display overrides", async () => {
    const repository = new MemoryAppRegistryRepository();
    const eventPublisher = new MemoryAppRegistryEventPublisher();
    const service = new AppRegistryService(testManifests, repository, eventPublisher);

    const actor = {
      applicationIds: ["app.devkit"],
      id: "admin-user",
      permissions: ["app-registry.admin"],
      sessionId: "session-1",
    };

    // Apply metadata override
    await service.setApplicationOverride("app.devkit", { displayName: "DevKit Pro", notes: "Developer suite" }, actor);

    const detail = await service.getApplicationDetail("app.devkit");
    expect(detail!.name).toBe("DevKit Pro");
    // Authoritative properties cannot be changed
    expect(detail!.id).toBe("app.devkit");
    expect(detail!.version).toBe("0.1.1");
    expect(detail!.dependencies).toEqual(["platform.core"]);
    expect(detail!.owner).toBe("DevKit");
  });

  it("evaluates application entitlement states accurately", async () => {
    const service = new AppRegistryService(
      testManifests,
      new MemoryAppRegistryRepository(),
      new MemoryAppRegistryEventPublisher()
    );

    const operator = {
      applicationIds: ["app.devkit"],
      id: "operator-user",
      permissions: ["app.access"],
      sessionId: "session-2",
    };

    const overview = await service.getOverview(operator);
    const devkit = overview.applications.find((a) => a.id === "app.devkit");
    const zetro = overview.applications.find((a) => a.id === "app.zetro");

    expect(devkit!.entitlementState).toBe("entitled");
    expect(zetro!.entitlementState).toBe("unentitled");
  });

  it("distinguishes tenant-neutral and tenant-enabled registry states", async () => {
    const neutralService = new AppRegistryService(
      testManifests,
      new MemoryAppRegistryRepository(),
      new MemoryAppRegistryEventPublisher(),
      undefined,
      false
    );

    const neutralOverview = await neutralService.getOverview();
    expect(neutralOverview.composition.tenantAddonEnabled).toBe(false);
    expect(neutralOverview.applications.every((a) => a.isTenantAware === false)).toBe(true);

    const tenantService = new AppRegistryService(
      testManifests,
      new MemoryAppRegistryRepository(),
      new MemoryAppRegistryEventPublisher(),
      undefined,
      true
    );

    const tenantOverview = await tenantService.getOverview();
    expect(tenantOverview.composition.tenantAddonEnabled).toBe(true);
    const devkitTenant = tenantOverview.applications.find((a) => a.id === "app.devkit");
    expect(devkitTenant!.isTenantAware).toBe(true);
  });
});
