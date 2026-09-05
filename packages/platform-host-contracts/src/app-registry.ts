export type ModulePersistenceStatus = {
  databaseProvider?: string;
  migrationLedgerStatus?: "applied" | "pending" | "none";
  migrationName?: string;
  outboxTopics?: readonly string[];
  seedStatus?: "applied" | "pending" | "none";
  tables?: readonly string[];
};

export type ModuleEventsInfo = {
  consumed?: readonly string[];
  published?: readonly string[];
};

export type PlatformAppModuleDTO = {
  apiRoutes?: readonly string[];
  areaId?: string;
  capabilities: readonly string[];
  dependencies: readonly string[];
  events?: ModuleEventsInfo;
  id: string;
  isTenantAware?: boolean;
  name: string;
  owner: string;
  permissions?: readonly string[];
  persistence?: ModulePersistenceStatus;
  publicContracts: readonly string[];
  reverseDependencies?: readonly string[];
  runtimeServices?: readonly string[];
  status: "active" | "disabled" | "degraded";
  technicalName: string;
  uiRoutes?: readonly string[];
  workers?: readonly string[];
  workspaceRoute?: string;
};

export type PlatformAppAreaDTO = {
  description?: string;
  id: string;
  modules: PlatformAppModuleDTO[];
  name: string;
};

export type ApplicationState = "active" | "disabled";
export type ApplicationRuntimeStatus = "running" | "stopped" | "degraded" | "unknown";
export type ApplicationEntitlementState = "entitled" | "unentitled" | "restricted";

export type PlatformApplicationSummaryDTO = {
  apiUrl?: string;
  areasCount: number;
  description: string;
  entitlementState: ApplicationEntitlementState;
  hasPublicManagementContract: boolean;
  id: string;
  isTenantAware?: boolean;
  modulesCount: number;
  name: string;
  owner: string;
  runtimeStatus: ApplicationRuntimeStatus;
  state: ApplicationState;
  version: string;
  webUrl?: string;
};

export type PlatformApplicationDetailDTO = {
  apiUrl?: string;
  areas: PlatformAppAreaDTO[];
  declaredPermissions: readonly string[];
  dependencies: readonly string[];
  description: string;
  entitlementState: ApplicationEntitlementState;
  hasPublicManagementContract: boolean;
  id: string;
  isTenantAware?: boolean;
  modules: PlatformAppModuleDTO[];
  name: string;
  owner: string;
  requiredHostCapabilities: readonly string[];
  reverseDependencies: readonly string[];
  runtimeServices: RuntimeServiceStatusDTO[];
  runtimeStatus: ApplicationRuntimeStatus;
  state: ApplicationState;
  version: string;
  webUrl?: string;
};

export type StructureNodeType =
  | "framework"
  | "platform-host"
  | "identity"
  | "tenant-addon"
  | "application"
  | "module"
  | "provider-service";

export type StructureNodeDTO = {
  children?: StructureNodeDTO[];
  errorDetails?: readonly string[];
  id: string;
  isTenantAware: boolean;
  name: string;
  owner: string;
  status: "healthy" | "warning" | "error";
  technicalName: string;
  type: StructureNodeType;
};

export type RuntimeServiceStatusDTO = {
  canRestart: boolean;
  canStop: boolean;
  id: string;
  lastHealthResult: {
    details?: string;
    status: "ok" | "degraded" | "error";
    timestamp: string;
  };
  name: string;
  restartRecoveryState: "stable" | "recovering" | "failed";
  serviceUrl?: string;
  status: ApplicationRuntimeStatus;
};

export type DataBoundaryModuleDTO = {
  databaseProvider: string;
  migrationLedgerStatus: "applied" | "pending" | "none";
  migrationName?: string;
  moduleId: string;
  moduleName: string;
  outboxTopics: readonly string[];
  owner: string;
  seedStatus: "applied" | "pending" | "none";
  tables: readonly string[];
  tenancyEnabled: boolean;
};

export type SecurityBoundaryItemDTO = {
  declaredBy: string;
  entitlementRequirement: "none" | "explicit" | "super-admin";
  hostCapabilities: readonly string[];
  identityRequirement: "anonymous" | "authenticated" | "privileged";
  id: string;
  name: string;
  requiredPermissions: readonly string[];
  tenantContextRequirement: "neutral" | "optional" | "required";
};

export type AppRegistryOverviewDTO = {
  applications: PlatformApplicationSummaryDTO[];
  composition: {
    framework: string;
    host: string;
    identity: string;
    tenantAddonEnabled: boolean;
  };
  dataBoundaries: DataBoundaryModuleDTO[];
  runtimeServices: RuntimeServiceStatusDTO[];
  securityBoundaries: SecurityBoundaryItemDTO[];
  structures: StructureNodeDTO[];
};

export type UpdateApplicationStateInput = {
  enabled: boolean;
};

export type UpdateApplicationOverrideInput = {
  displayName?: string;
  notes?: string;
};

export type RuntimeServiceActionInput = {
  action: "restart" | "stop";
};

export type RuntimeServiceActionResultDTO = {
  action: "restart" | "stop";
  message: string;
  serviceId: string;
  status: ApplicationRuntimeStatus;
  timestamp: string;
};
