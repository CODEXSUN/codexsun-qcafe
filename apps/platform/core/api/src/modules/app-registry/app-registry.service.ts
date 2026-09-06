import type { ModuleManifest } from "@codexsun/contracts";
import type {
  AppRegistryOverviewDTO,
  DataBoundaryModuleDTO,
  PlatformActor,
  PlatformAppAreaDTO,
  PlatformApplicationDetailDTO,
  PlatformApplicationSummaryDTO,
  PlatformAppModuleDTO,
  RuntimeServiceActionResultDTO,
  RuntimeServiceStatusDTO,
  SecurityBoundaryItemDTO,
  StructureNodeDTO,
  UpdateApplicationOverrideInput,
} from "@codexsun/platform-host-contracts";
import type { AppOverrideRecord } from "./app-registry.types.js";
import type { AppRegistryRepository } from "./app-registry.repository.js";
import type { AppRegistryEventPublisher } from "./app-registry.events.js";

export type ModuleOwnershipInfo = {
  id: string;
  owner: string;
  protectedPaths: readonly string[];
  publicContracts: readonly string[];
  roots: readonly string[];
};

const DEFAULT_OWNERSHIP_MAP: Record<string, ModuleOwnershipInfo> = {
  "addon.chat": { id: "addon.chat", owner: "Chat", protectedPaths: ["packages/chat/api/src", "packages/chat/contracts/src", "packages/chat/web/src"], publicContracts: ["/api/v1/chat", "@codexsun/chat-api", "@codexsun/chat-contracts", "@codexsun/chat-web"], roots: ["packages/chat"] },
  "addon.devkit-ito": { id: "addon.devkit-ito", owner: "DevKit", protectedPaths: ["packages/devkit-ito/src"], publicContracts: ["@codexsun/devkit-ito"], roots: ["packages/devkit-ito"] },
  "app.agent-crew": { id: "app.agent-crew", owner: "Agent Crew", protectedPaths: ["apps/agent-crew/api/src", "apps/agent-crew/docker"], publicContracts: ["/api/v1/messages"], roots: ["apps/agent-crew"] },
  "app.ai-task-system": { id: "app.ai-task-system", owner: "AI Task System", protectedPaths: ["packages/ai-task-system/contracts/src", "packages/ai-task-system/api/src", "packages/ai-task-system/web/src"], publicContracts: ["/api/v1/ai-tasks", "@codexsun/ai-task-contracts", "@codexsun/ai-task-api", "@codexsun/ai-task-web"], roots: ["packages/ai-task-system"] },
  "app.devkit": { id: "app.devkit", owner: "DevKit", protectedPaths: ["apps/devkit/web/src"], publicContracts: ["@codexsun/devkit-web"], roots: ["apps/devkit"] },
  "app.neot": { id: "app.neot", owner: "NEOT LMS", protectedPaths: ["apps/neot/api/migrations"], publicContracts: ["/api/v1/neot", "@codexsun/neot-web"], roots: ["apps/neot"] },
  "app.q-cafe": { id: "app.q-cafe", owner: "Q Cafe", protectedPaths: ["apps/q-cafe/api/migrations"], publicContracts: ["/api/v1/q-cafe", "@codexsun/q-cafe-web"], roots: ["apps/q-cafe"] },
  "app.zetro": { id: "app.zetro", owner: "Zetro", protectedPaths: ["packages/zetro/api/src", "packages/zetro/web/src"], publicContracts: ["@codexsun/zetro-api", "@codexsun/zetro-web"], roots: ["packages/zetro"] },
  "framework.kernel": { id: "framework.kernel", owner: "Framework", protectedPaths: ["packages/framework/src"], publicContracts: ["@codexsun/framework"], roots: ["packages/framework"] },
  "platform.core": { id: "platform.core", owner: "Platform Core", protectedPaths: ["apps/platform/core/api/src", "apps/platform/core/web/src"], publicContracts: ["/api/v1/core", "/api/v1/registry", "@codexsun/core-api", "@codexsun/core-web"], roots: ["apps/platform/core"] },
  "platform.dcs": { id: "platform.dcs", owner: "DCS", protectedPaths: [], publicContracts: ["@codexsun/dcs", "/dcs/ws"], roots: ["packages/dcs"] },
  "platform.execution": { id: "platform.execution", owner: "Platform Execution", protectedPaths: ["packages/runtime/src"], publicContracts: ["@codexsun/runtime"], roots: ["packages/runtime"] },
  "platform.identity": { id: "platform.identity", owner: "Platform Identity", protectedPaths: ["apps/platform/core/api/src/modules/identity", "packages/identity-contracts/src", "packages/platform-host-contracts/src"], publicContracts: ["@codexsun/identity-contracts", "@codexsun/platform-host-contracts"], roots: ["apps/platform/core/api/src/modules/identity", "packages/identity-contracts", "packages/platform-host-contracts", "packages/identity-web"] },
  "platform.runtime": { id: "platform.runtime", owner: "Platform Runtime", protectedPaths: ["packages/runtime/src"], publicContracts: ["@codexsun/runtime"], roots: ["packages/runtime"] },
  "platform.vps": { id: "platform.vps", owner: "Platform VPS", protectedPaths: [], publicContracts: ["/api/v1/vps"], roots: ["apps/platform/core/api/src/modules/vps"] },
  "runtime.zxa": { id: "runtime.zxa", owner: "ZXA", protectedPaths: ["packages/zxa/docker"], publicContracts: ["/api/v1/zxa", "/c/messages", "/g/messages", "/o/messages"], roots: ["packages/zxa"] },
  "shared.contracts": { id: "shared.contracts", owner: "Shared Contracts", protectedPaths: ["packages/contracts/src"], publicContracts: ["@codexsun/contracts"], roots: ["packages/contracts"] },
  "shared.desk": { id: "shared.desk", owner: "Shared Desk", protectedPaths: ["packages/ui/desk/src"], publicContracts: ["@codexsun/ui-desk"], roots: ["packages/ui/desk"] },
  "shared.ui": { id: "shared.ui", owner: "Shared UI", protectedPaths: ["packages/ui/src"], publicContracts: ["@codexsun/ui"], roots: ["packages/ui"] },
};

const KNOWN_APP_AREAS: Record<string, { id: string; name: string; description: string; moduleIds: string[] }[]> = {
  "app.devkit": [
    { description: "Developer workspace and command bar.", id: "devkit.workspace", moduleIds: ["devkit.chrome", "devkit.tools"], name: "Developer Workspace" },
    { description: "Interface topology inspection tools.", id: "devkit.inspection", moduleIds: ["devkit.ito-overlay"], name: "Inspection Tools" },
  ],
  "app.q-cafe": [
    { description: "Restaurant orders and cashier register.", id: "qcafe.pos", moduleIds: ["qcafe.orders", "qcafe.billing"], name: "Point of Sale" },
    { description: "Kitchen display, recipe stock, and tables.", id: "qcafe.operations", moduleIds: ["qcafe.kitchen", "qcafe.inventory"], name: "Kitchen & Inventory" },
  ],
  "app.zetro": [
    { description: "Agent orchestration, isolated runtimes, and conversations.", id: "zetro.orchestration", moduleIds: ["zetro.agents", "zetro.conversations"], name: "Agent Execution" },
  ],
  "platform.core": [
    { description: "Kernel module registry and host deployment services.", id: "platform.kernel", moduleIds: ["platform.core", "platform.registry"], name: "Kernel & Host" },
    { description: "Identity authentication and token verification services.", id: "platform.auth", moduleIds: ["platform.identity"], name: "Authentication & Security" },
  ],
};

const DEFAULT_RUNTIME_SERVICES: RuntimeServiceStatusDTO[] = [
  { canRestart: true, canStop: false, id: "srv.platform-api", lastHealthResult: { status: "ok", timestamp: new Date().toISOString() }, name: "Platform API", restartRecoveryState: "stable", serviceUrl: "http://127.0.0.1:5173/api", status: "running" },
  { canRestart: true, canStop: false, id: "srv.platform-web", lastHealthResult: { status: "ok", timestamp: new Date().toISOString() }, name: "Platform Web", restartRecoveryState: "stable", serviceUrl: "http://127.0.0.1:5173", status: "running" },
  { canRestart: true, canStop: false, id: "srv.platform-identity", lastHealthResult: { status: "ok", timestamp: new Date().toISOString() }, name: "Platform Identity", restartRecoveryState: "stable", serviceUrl: "http://127.0.0.1:5173/api/v1/auth", status: "running" },
  { canRestart: true, canStop: true, id: "srv.devkit-web", lastHealthResult: { status: "ok", timestamp: new Date().toISOString() }, name: "DevKit Web", restartRecoveryState: "stable", serviceUrl: "http://127.0.0.1:5174", status: "running" },
  { canRestart: true, canStop: true, id: "srv.chat-api", lastHealthResult: { status: "ok", timestamp: new Date().toISOString() }, name: "Chat API", restartRecoveryState: "stable", serviceUrl: "http://127.0.0.1:5178/api", status: "running" },
  { canRestart: true, canStop: true, id: "srv.chat-web", lastHealthResult: { status: "ok", timestamp: new Date().toISOString() }, name: "Chat Web", restartRecoveryState: "stable", serviceUrl: "http://127.0.0.1:5178", status: "running" },
  { canRestart: true, canStop: true, id: "srv.zetro-api", lastHealthResult: { status: "ok", timestamp: new Date().toISOString() }, name: "Zetro API", restartRecoveryState: "stable", serviceUrl: "http://127.0.0.1:5175/api", status: "running" },
  { canRestart: true, canStop: true, id: "srv.zetro-web", lastHealthResult: { status: "ok", timestamp: new Date().toISOString() }, name: "Zetro Web", restartRecoveryState: "stable", serviceUrl: "http://127.0.0.1:5175", status: "running" },
];

export class AppRegistryService {
  constructor(
    private readonly manifests: readonly ModuleManifest[],
    private readonly repository: AppRegistryRepository,
    private readonly eventPublisher: AppRegistryEventPublisher,
    private readonly ownership: Record<string, ModuleOwnershipInfo> = DEFAULT_OWNERSHIP_MAP,
    private readonly tenancyEnabled: boolean = false,
    private readonly databaseProvider: string = "sqlite"
  ) {}

  async getOverview(actor?: PlatformActor): Promise<AppRegistryOverviewDTO> {
    const overrides = await this.repository.listOverrides();
    const overrideMap = new Map(overrides.map((item) => [item.application_id, item]));

    const applications: PlatformApplicationSummaryDTO[] = [];
    for (const manifest of this.manifests) {
      if (manifest.kind !== "application" && !manifest.id.startsWith("platform.")) continue;
      const override = overrideMap.get(manifest.id);
      const isEnabled = override ? override.state === "active" : true;
      const declaredOwner = this.ownership[manifest.id]?.owner ?? (manifest.kind === "platform" ? "Platform Core" : manifest.name);
      const areas = KNOWN_APP_AREAS[manifest.id] ?? [];
      const modulesCount = areas.reduce((acc, area) => acc + area.moduleIds.length, 1);

      applications.push({
        apiUrl: manifest.webUrl ? `${manifest.webUrl}/api` : undefined,
        areasCount: areas.length,
        description: manifest.description,
        entitlementState: this.resolveEntitlement(manifest.id, actor),
        hasPublicManagementContract: this.checkPublicManagementContract(manifest.id),
        id: manifest.id,
        isTenantAware: this.tenancyEnabled && manifest.kind === "application",
        modulesCount,
        name: override?.display_name || manifest.name,
        owner: declaredOwner,
        runtimeStatus: isEnabled ? "running" : "stopped",
        state: isEnabled ? "active" : "disabled",
        version: manifest.version,
        webUrl: manifest.webUrl,
      });
    }

    return {
      applications,
      composition: {
        framework: "@codexsun/framework (Tenancy-neutral)",
        host: "Platform Core API & Web",
        identity: "Platform Identity (Shared)",
        tenantAddonEnabled: this.tenancyEnabled,
      },
      dataBoundaries: this.getDataBoundaries(),
      runtimeServices: DEFAULT_RUNTIME_SERVICES,
      securityBoundaries: this.getSecurityBoundaries(),
      structures: this.getStructuresComposition(),
    };
  }

  async getApplicationDetail(applicationId: string, actor?: PlatformActor): Promise<PlatformApplicationDetailDTO | undefined> {
    const manifest = this.manifests.find((item) => item.id === applicationId);
    if (!manifest) return undefined;

    const override = await this.repository.findOverride(applicationId);
    const isEnabled = override ? override.state === "active" : true;
    const declaredOwner = this.ownership[manifest.id]?.owner ?? manifest.name;

    const reverseDependencies = this.findReverseDependencies(applicationId);
    const areas = this.buildAreas(manifest);
    const modules = areas.flatMap((area) => area.modules);

    return {
      apiUrl: manifest.webUrl ? `${manifest.webUrl}/api` : undefined,
      areas,
      declaredPermissions: manifest.capabilities.map((capability) => `${applicationId}.${capability}`),
      dependencies: manifest.dependencies,
      description: manifest.description,
      entitlementState: this.resolveEntitlement(manifest.id, actor),
      hasPublicManagementContract: this.checkPublicManagementContract(manifest.id),
      id: manifest.id,
      isTenantAware: this.tenancyEnabled && manifest.kind === "application",
      modules,
      name: override?.display_name || manifest.name,
      owner: declaredOwner,
      requiredHostCapabilities: ["credentials", "sessions", ...manifest.capabilities],
      reverseDependencies,
      runtimeServices: DEFAULT_RUNTIME_SERVICES.filter((svc) => svc.id.includes(manifest.id.replace("app.", "").replace("platform.", ""))),
      runtimeStatus: isEnabled ? "running" : "stopped",
      state: isEnabled ? "active" : "disabled",
      version: manifest.version,
      webUrl: manifest.webUrl,
    };
  }

  async setApplicationState(applicationId: string, enabled: boolean, actor: PlatformActor): Promise<PlatformApplicationSummaryDTO> {
    const manifest = this.manifests.find((item) => item.id === applicationId);
    if (!manifest) throw new Error(`Application ${applicationId} not found.`);

    if ((manifest.id === "platform.core" || manifest.id === "platform.identity") && !enabled) {
      throw new Error(`Cannot disable critical platform component ${manifest.id}.`);
    }

    const existing = await this.repository.findOverride(applicationId);
    const now = new Date().toISOString();
    const updatedRecord: AppOverrideRecord = {
      application_id: applicationId,
      display_name: existing?.display_name ?? null,
      id: applicationId,
      notes: existing?.notes ?? null,
      state: enabled ? "active" : "disabled",
      updated_at: now,
      updated_by: actor.id,
    };

    await this.repository.saveOverride(updatedRecord);

    await this.eventPublisher.publish({
      action: "state_changed",
      actorId: actor.id,
      applicationId,
      details: { enabled, state: updatedRecord.state },
      timestamp: now,
      type: "registry.app.state_changed",
    });

    const detail = await this.getApplicationDetail(applicationId, actor);
    return {
      apiUrl: detail!.apiUrl,
      areasCount: detail!.areas.length,
      description: detail!.description,
      entitlementState: detail!.entitlementState,
      hasPublicManagementContract: detail!.hasPublicManagementContract,
      id: detail!.id,
      isTenantAware: detail!.isTenantAware,
      modulesCount: detail!.modules.length,
      name: detail!.name,
      owner: detail!.owner,
      runtimeStatus: detail!.runtimeStatus,
      state: detail!.state,
      version: detail!.version,
      webUrl: detail!.webUrl,
    };
  }

  async setApplicationOverride(applicationId: string, input: UpdateApplicationOverrideInput, actor: PlatformActor): Promise<PlatformApplicationSummaryDTO> {
    const manifest = this.manifests.find((item) => item.id === applicationId);
    if (!manifest) throw new Error(`Application ${applicationId} not found.`);

    const existing = await this.repository.findOverride(applicationId);
    const now = new Date().toISOString();
    const updatedRecord: AppOverrideRecord = {
      application_id: applicationId,
      display_name: input.displayName !== undefined ? input.displayName.trim() || null : (existing?.display_name ?? null),
      id: applicationId,
      notes: input.notes !== undefined ? input.notes.trim() || null : (existing?.notes ?? null),
      state: existing?.state ?? "active",
      updated_at: now,
      updated_by: actor.id,
    };

    await this.repository.saveOverride(updatedRecord);

    await this.eventPublisher.publish({
      action: "override_updated",
      actorId: actor.id,
      applicationId,
      details: { displayName: updatedRecord.display_name, notes: updatedRecord.notes },
      timestamp: now,
      type: "registry.app.override_updated",
    });

    const detail = await this.getApplicationDetail(applicationId, actor);
    return {
      apiUrl: detail!.apiUrl,
      areasCount: detail!.areas.length,
      description: detail!.description,
      entitlementState: detail!.entitlementState,
      hasPublicManagementContract: detail!.hasPublicManagementContract,
      id: detail!.id,
      isTenantAware: detail!.isTenantAware,
      modulesCount: detail!.modules.length,
      name: detail!.name,
      owner: detail!.owner,
      runtimeStatus: detail!.runtimeStatus,
      state: detail!.state,
      version: detail!.version,
      webUrl: detail!.webUrl,
    };
  }

  async triggerRuntimeAction(serviceId: string, action: "restart" | "stop", actor: PlatformActor): Promise<RuntimeServiceActionResultDTO> {
    const service = DEFAULT_RUNTIME_SERVICES.find((svc) => svc.id === serviceId);
    if (!service) throw new Error(`Runtime service ${serviceId} not found.`);

    if (action === "stop" && !service.canStop) {
      throw new Error(`Cannot stop critical host service ${serviceId}.`);
    }

    const timestamp = new Date().toISOString();
    await this.eventPublisher.publish({
      action: "runtime_action",
      actorId: actor.id,
      applicationId: serviceId,
      details: { action, serviceId },
      timestamp,
      type: "registry.runtime.action_triggered",
    });

    return {
      action,
      message: `Action ${action} executed successfully for service ${service.name}.`,
      serviceId,
      status: action === "stop" ? "stopped" : "running",
      timestamp,
    };
  }

  findReverseDependencies(targetId: string): string[] {
    const dependents: string[] = [];
    for (const manifest of this.manifests) {
      if (manifest.id !== targetId && manifest.dependencies.includes(targetId)) {
        dependents.push(manifest.id);
      }
    }
    return dependents;
  }

  validateDependencies(): { cyclic: string[][]; missing: { from: string; missingDependency: string }[] } {
    const manifestIds = new Set(this.manifests.map((item) => item.id));
    const missing: { from: string; missingDependency: string }[] = [];
    for (const manifest of this.manifests) {
      for (const dep of manifest.dependencies) {
        if (!manifestIds.has(dep)) {
          missing.push({ from: manifest.id, missingDependency: dep });
        }
      }
    }

    const cyclic: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const checkCycles = (curr: string, path: string[]) => {
      visited.add(curr);
      recStack.add(curr);
      path.push(curr);

      const node = this.manifests.find((m) => m.id === curr);
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            checkCycles(dep, [...path]);
          } else if (recStack.has(dep)) {
            cyclic.push([...path, dep]);
          }
        }
      }
      recStack.delete(curr);
    };

    for (const manifest of this.manifests) {
      if (!visited.has(manifest.id)) {
        checkCycles(manifest.id, []);
      }
    }

    return { cyclic, missing };
  }

  validateOwnershipRegistry(): { unownedModules: string[]; valid: boolean } {
    const unownedModules: string[] = [];
    for (const manifest of this.manifests) {
      if (!this.ownership[manifest.id]) {
        unownedModules.push(manifest.id);
      }
    }
    return {
      unownedModules,
      valid: unownedModules.length === 0,
    };
  }

  getStructuresComposition(): StructureNodeDTO[] {
    const ownershipValidation = this.validateOwnershipRegistry();

    return [
      {
        children: [
          {
            children: [
              {
                children: [
                  ...(this.tenancyEnabled
                    ? [
                        {
                          children: this.buildAppStructureNodes(),
                          id: "node.tenant-addon",
                          isTenantAware: true,
                          name: "Tenant Add-on Context",
                          owner: "Platform Tenant Extension",
                          status: "healthy" as const,
                          technicalName: "platform.structure.tenantContext",
                          type: "tenant-addon" as const,
                        },
                      ]
                    : this.buildAppStructureNodes()),
                ],
                id: "node.identity",
                isTenantAware: false,
                name: "Platform Identity Foundation",
                owner: "Platform Identity",
                status: "healthy",
                technicalName: "platform.structure.identity",
                type: "identity",
              },
            ],
            errorDetails: ownershipValidation.valid ? undefined : [`Unregistered modules: ${ownershipValidation.unownedModules.join(", ")}`],
            id: "node.platform-host",
            isTenantAware: false,
            name: "Platform Host Runtime",
            owner: "Platform Core",
            status: ownershipValidation.valid ? "healthy" : "warning",
            technicalName: "platform.structure.host",
            type: "platform-host",
          },
        ],
        id: "node.framework",
        isTenantAware: false,
        name: "Kernel Framework",
        owner: "Framework",
        status: "healthy",
        technicalName: "framework.kernel.composition",
        type: "framework",
      },
    ];
  }

  private buildAppStructureNodes(): StructureNodeDTO[] {
    return this.manifests
      .filter((manifest) => manifest.kind === "application")
      .map((app) => {
        const ownerInfo = this.ownership[app.id];
        const isRegistered = Boolean(ownerInfo);
        return {
          children: (KNOWN_APP_AREAS[app.id] ?? []).map((area) => ({
            children: area.moduleIds.map((modId) => ({
              id: `node.mod.${modId}`,
              isTenantAware: this.tenancyEnabled,
              name: modId,
              owner: ownerInfo?.owner ?? app.name,
              status: "healthy" as const,
              technicalName: `structure.module.${modId}`,
              type: "module" as const,
            })),
            id: `node.area.${area.id}`,
            isTenantAware: this.tenancyEnabled,
            name: area.name,
            owner: ownerInfo?.owner ?? app.name,
            status: "healthy" as const,
            technicalName: `structure.area.${area.id}`,
            type: "module" as const,
          })),
          errorDetails: isRegistered ? undefined : [`Missing ownership registration for application ${app.id}`],
          id: `node.app.${app.id}`,
          isTenantAware: this.tenancyEnabled,
          name: app.name,
          owner: ownerInfo?.owner ?? app.name,
          status: isRegistered ? "healthy" : "warning",
          technicalName: `structure.app.${app.id}`,
          type: "application" as const,
        };
      });
  }

  private buildAreas(manifest: ModuleManifest): PlatformAppAreaDTO[] {
    const declaredAreas = KNOWN_APP_AREAS[manifest.id];
    const declaredOwner = this.ownership[manifest.id]?.owner ?? manifest.name;

    if (declaredAreas && declaredAreas.length > 0) {
      return declaredAreas.map((area) => ({
        description: area.description,
        id: area.id,
        modules: area.moduleIds.map((modId) => this.buildModuleDTO(modId, area.id, declaredOwner, manifest)),
        name: area.name,
      }));
    }

    return [
      {
        description: manifest.description,
        id: `${manifest.id}.core`,
        modules: [this.buildModuleDTO(manifest.id, `${manifest.id}.core`, declaredOwner, manifest)],
        name: `${manifest.name} Core Area`,
      },
    ];
  }

  private buildModuleDTO(moduleId: string, areaId: string, owner: string, manifest: ModuleManifest): PlatformAppModuleDTO {
    const isMain = moduleId === manifest.id;
    return {
      apiRoutes: isMain ? [`/api/v1/${manifest.id.replace("app.", "").replace("platform.", "")}`] : undefined,
      areaId,
      capabilities: manifest.capabilities,
      dependencies: manifest.dependencies,
      events: {
        consumed: [`${manifest.id}.lifecycle`],
        published: [`${manifest.id}.audit`],
      },
      id: moduleId,
      isTenantAware: this.tenancyEnabled && manifest.kind === "application",
      name: isMain ? manifest.name : `${manifest.name} ${moduleId.split(".").pop()}`,
      owner,
      permissions: manifest.capabilities.map((c) => `${moduleId}.${c}`),
      persistence: {
        databaseProvider: this.databaseProvider,
        migrationLedgerStatus: "applied",
        migrationName: `${moduleId}.v1`,
        outboxTopics: [`${manifest.id}.events`],
        seedStatus: "applied",
        tables: [`${moduleId.replace(/[^a-z0-9_]/gi, "_")}_ledger`],
      },
      publicContracts: this.ownership[moduleId]?.publicContracts ?? (manifest.webUrl ? [`@codexsun/${manifest.id.replace("app.", "").replace("platform.", "")}`] : []),
      reverseDependencies: this.findReverseDependencies(moduleId),
      runtimeServices: [moduleId],
      status: "active",
      technicalName: `module.${moduleId}`,
      uiRoutes: manifest.webUrl ? [manifest.webUrl] : undefined,
      workers: [],
      workspaceRoute: manifest.webUrl,
    };
  }

  private getDataBoundaries(): DataBoundaryModuleDTO[] {
    const boundaries: DataBoundaryModuleDTO[] = [
      {
        databaseProvider: this.databaseProvider,
        migrationLedgerStatus: "applied",
        migrationName: "identity.foundation.v1",
        moduleId: "platform.identity",
        moduleName: "Identity Foundation",
        outboxTopics: ["identity.audit"],
        owner: "Platform Identity",
        seedStatus: "applied",
        tables: ["identity_accounts", "identity_sessions"],
        tenancyEnabled: this.tenancyEnabled,
      },
      {
        databaseProvider: this.databaseProvider,
        migrationLedgerStatus: "applied",
        migrationName: "platform.persistence.v1",
        moduleId: "platform.persistence",
        moduleName: "Platform Persistence & Outbox",
        outboxTopics: ["platform.lifecycle"],
        owner: "Platform Core",
        seedStatus: "applied",
        tables: ["platform_events", "platform_outbox", "platform_migrations"],
        tenancyEnabled: false,
      },
      {
        databaseProvider: this.databaseProvider,
        migrationLedgerStatus: "applied",
        migrationName: "platform.app-registry.v1",
        moduleId: "platform.app-registry",
        moduleName: "Application Registry",
        outboxTopics: ["platform.registry"],
        owner: "Platform Core",
        seedStatus: "applied",
        tables: ["platform_app_overrides"],
        tenancyEnabled: false,
      },
    ];

    if (this.manifests.some((m) => m.id === "addon.chat" || m.id === "app.chat")) {
      boundaries.push({
        databaseProvider: this.databaseProvider,
        migrationLedgerStatus: "applied",
        migrationName: "chat.persistence.v1",
        moduleId: "addon.chat",
        moduleName: "Chat Persistence",
        outboxTopics: ["chat.events"],
        owner: "Chat",
        seedStatus: "none",
        tables: ["chat_conversations", "chat_messages"],
        tenancyEnabled: this.tenancyEnabled,
      });
    }

    if (this.manifests.some((m) => m.id === "app.docs")) {
      boundaries.push({
        databaseProvider: this.databaseProvider,
        migrationLedgerStatus: "applied",
        migrationName: "docs.pages.v1",
        moduleId: "app.docs",
        moduleName: "Docs Persistence",
        outboxTopics: [],
        owner: "Docs",
        seedStatus: "none",
        tables: ["docs_pages"],
        tenancyEnabled: false,
      });
    }

    return boundaries;
  }

  private getSecurityBoundaries(): SecurityBoundaryItemDTO[] {
    return [
      {
        declaredBy: "platform.identity",
        entitlementRequirement: "none",
        hostCapabilities: ["credentials", "sessions", "token-verification"],
        identityRequirement: "privileged",
        id: "sec.identity",
        name: "Identity & Session Security",
        requiredPermissions: ["identity.manage", "identity.sessions"],
        tenantContextRequirement: "optional",
      },
      {
        declaredBy: "platform.core",
        entitlementRequirement: "explicit",
        hostCapabilities: ["desired-state", "deployments", "health"],
        identityRequirement: "authenticated",
        id: "sec.platform-registry",
        name: "Architecture & Registry Admin",
        requiredPermissions: ["app-registry.admin", "app.access"],
        tenantContextRequirement: "neutral",
      },
      {
        declaredBy: "app.devkit",
        entitlementRequirement: "explicit",
        hostCapabilities: ["developer-tools", "inspection"],
        identityRequirement: "authenticated",
        id: "sec.devkit",
        name: "DevKit Developer Tools",
        requiredPermissions: ["app.access", "devkit.inspect"],
        tenantContextRequirement: "neutral",
      },
      {
        declaredBy: "app.zetro",
        entitlementRequirement: "explicit",
        hostCapabilities: ["agent-dispatch", "conversations"],
        identityRequirement: "authenticated",
        id: "sec.zetro",
        name: "Zetro Agent Workspace",
        requiredPermissions: ["app.access", "agent.dispatch"],
        tenantContextRequirement: "neutral",
      },
    ];
  }

  private resolveEntitlement(applicationId: string, actor?: PlatformActor): "entitled" | "unentitled" | "restricted" {
    if (!actor) return "unentitled";
    if (actor.permissions.includes("identity.admin") || actor.permissions.includes("app-registry.admin")) return "entitled";
    return actor.applicationIds.includes(applicationId) ? "entitled" : "unentitled";
  }

  private checkPublicManagementContract(applicationId: string): boolean {
    const owner = this.ownership[applicationId];
    if (!owner) return false;
    return owner.publicContracts.some((c) => c.includes("contracts") || c.startsWith("/api/v1/"));
  }
}
