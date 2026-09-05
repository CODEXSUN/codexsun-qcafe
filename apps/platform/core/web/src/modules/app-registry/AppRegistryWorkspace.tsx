import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  Layers,
  Network,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sliders,
  Terminal,
  XCircle,
} from "lucide-react";
import {
  platformFetch,
  type AppRegistryOverviewDTO,
  type PlatformApplicationDetailDTO,
  type PlatformApplicationSummaryDTO,
  type PlatformAppModuleDTO,
  type RuntimeServiceStatusDTO,
  type StructureNodeDTO,
} from "@codexsun/platform-host-contracts";

type WorkspaceTab = "applications" | "structures" | "runtime" | "data" | "security";
type AppDetailTab = "overview" | "architecture" | "modules" | "contracts" | "runtime" | "security" | "data";

export function AppRegistryWorkspace() {
  const [overview, setOverview] = useState<AppRegistryOverviewDTO | null>(null);
  const [selectedAppDetail, setSelectedAppDetail] = useState<PlatformApplicationDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [errorState, setErrorState] = useState<"none" | "error" | "denied" | "unavailable">("none");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // URL state synchronization
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("applications");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<AppDetailTab>("overview");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

  // UI filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<"all" | "active" | "disabled">("all");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Sync state from URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("registryTab") as WorkspaceTab | null;
    const appIdParam = params.get("appId");
    const detailTabParam = params.get("appTab") as AppDetailTab | null;
    const moduleParam = params.get("moduleId");

    if (tabParam && ["applications", "structures", "runtime", "data", "security"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (appIdParam) {
      setSelectedAppId(appIdParam);
    }
    if (detailTabParam && ["overview", "architecture", "modules", "contracts", "runtime", "security", "data"].includes(detailTabParam)) {
      setActiveDetailTab(detailTabParam);
    }
    if (moduleParam) {
      setSelectedModuleId(moduleParam);
    }
  }, []);

  // Update URL params when navigation state changes
  const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setErrorState("none");
    try {
      const response = await platformFetch("/api/v1/registry");
      if (response.status === 401) {
        setErrorState("unavailable");
        setErrorMessage("Platform session is unavailable or unauthenticated.");
        return;
      }
      if (response.status === 403) {
        setErrorState("denied");
        setErrorMessage("Access denied: required permission missing.");
        return;
      }
      if (!response.ok) {
        throw new Error(`Registry request failed with HTTP ${response.status}`);
      }
      const data = await response.json();
      setOverview(data);
    } catch (err) {
      setErrorState("error");
      setErrorMessage((err as Error).message || "Failed to load architectural registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const loadAppDetail = useCallback(async (appId: string) => {
    setDetailLoading(true);
    try {
      const response = await platformFetch(`/api/v1/registry/apps/${appId}`);
      if (!response.ok) throw new Error(`Failed to load app ${appId}`);
      const data = await response.json();
      setSelectedAppDetail(data);
      if (data.areas.length > 0 && !selectedModuleId) {
        const firstArea = data.areas[0];
        setExpandedAreas((prev) => ({ ...prev, [firstArea.id]: true }));
        if (firstArea.modules.length > 0) {
          setSelectedModuleId(firstArea.modules[0].id);
        }
      }
    } catch (err) {
      setActionMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setDetailLoading(false);
    }
  }, [selectedModuleId]);

  useEffect(() => {
    if (selectedAppId) {
      void loadAppDetail(selectedAppId);
    } else {
      setSelectedAppDetail(null);
    }
  }, [selectedAppId, loadAppDetail]);

  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    setSelectedModuleId(null);
    setActiveDetailTab("overview");
    updateUrlParams({ appId, appTab: "overview", moduleId: null });
  };

  const handleBackToApps = () => {
    setSelectedAppId(null);
    setSelectedAppDetail(null);
    setSelectedModuleId(null);
    updateUrlParams({ appId: null, appTab: null, moduleId: null });
  };

  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    updateUrlParams({ registryTab: tab });
  };

  const handleDetailTabChange = (tab: AppDetailTab) => {
    setActiveDetailTab(tab);
    updateUrlParams({ appTab: tab });
  };

  const handleSelectModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    updateUrlParams({ moduleId });
  };

  const toggleArea = (areaId: string) => {
    setExpandedAreas((prev) => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleToggleAppState = async (appId: string, currentState: "active" | "disabled") => {
    const nextState = currentState !== "active";
    try {
      const response = await platformFetch(`/api/v1/registry/apps/${appId}/state`, {
        body: JSON.stringify({ enabled: nextState }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (response.status === 403) {
        setActionMessage({ text: "Permission denied: Requires 'app-registry.admin' permission.", type: "error" });
        return;
      }
      if (!response.ok) throw new Error("Failed to change application state");
      setActionMessage({ text: `Application state updated to ${nextState ? "active" : "disabled"}.`, type: "success" });
      void loadOverview();
      if (selectedAppId === appId) void loadAppDetail(appId);
    } catch (err) {
      setActionMessage({ text: (err as Error).message, type: "error" });
    }
  };

  const handleRuntimeAction = async (serviceId: string, action: "restart" | "stop") => {
    try {
      const response = await platformFetch(`/api/v1/registry/runtime/${serviceId}/action`, {
        body: JSON.stringify({ action }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (response.status === 403) {
        setActionMessage({ text: "Permission denied: Requires host admin privileges.", type: "error" });
        return;
      }
      if (!response.ok) throw new Error("Failed to execute runtime action");
      const result = await response.json();
      setActionMessage({ text: result.message, type: "success" });
      void loadOverview();
    } catch (err) {
      setActionMessage({ text: (err as Error).message, type: "error" });
    }
  };

  const filteredApplications = useMemo(() => {
    if (!overview) return [];
    return overview.applications.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterState === "all" ? true : filterState === "active" ? app.state === "active" : app.state === "disabled";
      return matchesSearch && matchesFilter;
    });
  }, [overview, searchQuery, filterState]);

  // Selected module lookup
  const selectedModule = useMemo<PlatformAppModuleDTO | undefined>(() => {
    if (!selectedAppDetail || !selectedModuleId) return undefined;
    for (const area of selectedAppDetail.areas) {
      const mod = area.modules.find((m) => m.id === selectedModuleId);
      if (mod) return mod;
    }
    return undefined;
  }, [selectedAppDetail, selectedModuleId]);

  // Render State: Loading
  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-muted-foreground" role="status">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Platform Architecture & Registry...</p>
      </div>
    );
  }

  // Render State: Denied (403)
  if (errorState === "denied") {
    return (
      <div className="mx-auto my-12 max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center" role="alert">
        <ShieldAlert className="mx-auto mb-4 size-12 text-destructive" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        <button
          className="mt-6 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:outline-none"
          onClick={loadOverview}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render State: Unavailable (401 / offline)
  if (errorState === "unavailable") {
    return (
      <div className="mx-auto my-12 max-w-lg rounded-2xl border border-border bg-card p-8 text-center" role="alert">
        <AlertCircle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Registry Unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        <button
          className="mt-6 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:outline-none"
          onClick={loadOverview}
        >
          Reconnect
        </button>
      </div>
    );
  }

  // Render State: Generic Error
  if (errorState === "error") {
    return (
      <div className="mx-auto my-12 max-w-lg rounded-2xl border border-destructive/20 bg-card p-8 text-center" role="alert">
        <XCircle className="mx-auto mb-4 size-12 text-destructive" />
        <h2 className="text-xl font-semibold text-foreground">Inspection Error</h2>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        <button
          className="mt-6 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:outline-none"
          onClick={loadOverview}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="app-registry-workspace">
      {/* Action Message Banner */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
            actionMessage.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border border-destructive/30 bg-destructive/10 text-destructive"
          }`}
          role="status"
        >
          <span>{actionMessage.text}</span>
          <button
            aria-label="Dismiss message"
            className="cursor-pointer text-xs font-semibold uppercase hover:underline focus:outline-none"
            onClick={() => setActionMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Workspace Navigation */}
      {!selectedAppId && (
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Architecture workspace views" className="flex items-center gap-2 overflow-x-auto">
            {(
              [
                { icon: Boxes, id: "applications", label: "Applications" },
                { icon: Network, id: "structures", label: "Structures" },
                { icon: Activity, id: "runtime", label: "Runtime" },
                { icon: Database, id: "data", label: "Data Boundaries" },
                { icon: Shield, id: "security", label: "Security" },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-ring focus:outline-none ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Framework: Neutral</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${overview?.composition.tenantAddonEnabled ? "bg-primary" : "bg-muted"}`} />
              <span>Tenancy: {overview?.composition.tenantAddonEnabled ? "Enabled" : "Neutral"}</span>
            </span>
          </div>
        </div>
      )}

      {/* VIEW: Application Detail */}
      {selectedAppId && selectedAppDetail && (
        <div className="flex flex-col gap-6">
          {/* Breadcrumb & Header */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <button
                className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                onClick={handleBackToApps}
              >
                <ArrowLeft size={16} />
                <span>Back to Applications</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Toggle application state"
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-ring focus:outline-none ${
                    selectedAppDetail.state === "active"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : "border border-muted bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => handleToggleAppState(selectedAppDetail.id, selectedAppDetail.state)}
                >
                  {selectedAppDetail.state === "active" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{selectedAppDetail.state === "active" ? "Enabled" : "Disabled"}</span>
                </button>
                {selectedAppDetail.webUrl && (
                  <a
                    aria-label={`Open ${selectedAppDetail.name} web interface`}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent focus:ring-2 focus:ring-ring focus:outline-none"
                    href={selectedAppDetail.webUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Launch</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedAppDetail.name}</h2>
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    v{selectedAppDetail.version}
                  </span>
                  <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    {selectedAppDetail.owner}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{selectedAppDetail.id}</span>
                  <button
                    aria-label="Copy application ID"
                    className="cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none"
                    onClick={() => copyToClipboard(selectedAppDetail.id)}
                  >
                    {copiedText === selectedAppDetail.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
              <p className="max-w-md text-sm text-muted-foreground">{selectedAppDetail.description}</p>
            </div>

            {/* App Detail Navigation Tabs */}
            <div className="mt-2 flex items-center gap-1 overflow-x-auto border-t border-border pt-4">
              {(
                [
                  { id: "overview", label: "Overview" },
                  { id: "architecture", label: "Architecture" },
                  { id: "modules", label: "Modules & Tree" },
                  { id: "contracts", label: "Contracts" },
                  { id: "runtime", label: "Runtime" },
                  { id: "security", label: "Security" },
                  { id: "data", label: "Data Boundaries" },
                ] as const
              ).map((tab) => (
                <button
                  aria-current={activeDetailTab === tab.id ? "true" : undefined}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:ring-2 focus:ring-ring focus:outline-none ${
                    activeDetailTab === tab.id
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                  key={tab.id}
                  onClick={() => handleDetailTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB: App Overview */}
          {activeDetailTab === "overview" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">Host Capabilities & Entitlement</h3>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Entitlement Status:</span>
                    <span className="font-medium capitalize text-foreground">{selectedAppDetail.entitlementState}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Tenancy Boundary:</span>
                    <span className="font-medium text-foreground">
                      {selectedAppDetail.isTenantAware ? "Tenant-Aware Extension" : "Tenancy-Neutral Base"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Public Management Contract:</span>
                    <span className="font-medium text-foreground">
                      {selectedAppDetail.hasPublicManagementContract ? "Exposed & Verified" : "Internal / None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Required Host Capabilities:</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedAppDetail.requiredHostCapabilities.map((cap) => (
                        <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs" key={cap}>
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">Declared Dependencies</h3>
                <div className="flex flex-col gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Direct Dependencies:</span>
                    {selectedAppDetail.dependencies.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">No direct application dependencies.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedAppDetail.dependencies.map((dep) => (
                          <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs" key={dep}>
                            {dep}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-muted-foreground">Reverse Dependencies (Dependents):</span>
                    {selectedAppDetail.reverseDependencies.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">No registered reverse dependents.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedAppDetail.reverseDependencies.map((dep) => (
                          <span
                            className="cursor-pointer rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary hover:bg-primary/20 focus:outline-none"
                            key={dep}
                            onClick={() => handleSelectApp(dep)}
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: App Architecture */}
          {activeDetailTab === "architecture" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">Application Area Hierarchy</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hierarchical projection of application areas, owned functional modules, and boundary separation.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {selectedAppDetail.areas.map((area) => (
                    <div className="rounded-xl border border-border bg-background p-4" key={area.id}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">{area.name}</h4>
                        <span className="font-mono text-xs text-muted-foreground">{area.id}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{area.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {area.modules.map((m) => (
                          <button
                            className="cursor-pointer rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-foreground hover:bg-accent focus:ring-1 focus:ring-ring focus:outline-none"
                            key={m.id}
                            onClick={() => {
                              setSelectedModuleId(m.id);
                              setActiveDetailTab("modules");
                            }}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Modules & Expandable Tree */}
          {activeDetailTab === "modules" && (
            <div className="grid gap-6 md:grid-cols-12">
              {/* Left Column: Expandable Tree */}
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:col-span-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modules Navigation</h3>
                <div className="flex flex-col gap-1 text-sm">
                  {selectedAppDetail.areas.map((area) => {
                    const isExpanded = expandedAreas[area.id] !== false;
                    return (
                      <div className="flex flex-col" key={area.id}>
                        <button
                          aria-expanded={isExpanded}
                          className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent focus:ring-1 focus:ring-ring focus:outline-none"
                          onClick={() => toggleArea(area.id)}
                        >
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{area.name}</span>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">{area.modules.length}</span>
                        </button>
                        {isExpanded && (
                          <div className="ml-4 flex flex-col border-l border-border pl-2">
                            {area.modules.map((mod) => {
                              const isSelected = selectedModuleId === mod.id;
                              return (
                                <button
                                  aria-current={isSelected ? "true" : undefined}
                                  className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors focus:ring-1 focus:ring-ring focus:outline-none ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground font-medium"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                  }`}
                                  key={mod.id}
                                  onClick={() => handleSelectModule(mod.id)}
                                >
                                  <span className="truncate">{mod.name}</span>
                                  <span className="font-mono text-[10px] opacity-75">{mod.status}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Leaf Module Detail Panel */}
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:col-span-7">
                {selectedModule ? (
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-foreground">{selectedModule.name}</h4>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {selectedModule.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                          <span>{selectedModule.technicalName}</span>
                          <button
                            aria-label="Copy technical name"
                            className="cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none"
                            onClick={() => copyToClipboard(selectedModule.technicalName)}
                          >
                            {copiedText === selectedModule.technicalName ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-muted-foreground">Owner</span>
                        <p className="font-medium text-foreground">{selectedModule.owner}</p>
                      </div>
                    </div>

                    {/* Capabilities & Permissions */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Capabilities</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedModule.capabilities.map((c) => (
                          <span className="rounded border border-border bg-background px-2 py-0.5 text-xs" key={c}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Persistence & Migration */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Persistence Boundary</span>
                      <div className="rounded-lg border border-border bg-background p-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Database Provider:</span>
                            <p className="font-medium capitalize text-foreground">
                              {selectedModule.persistence?.databaseProvider ?? "None"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Migration Ledger:</span>
                            <p className="font-medium text-foreground">
                              {selectedModule.persistence?.migrationLedgerStatus ?? "applied"} (
                              {selectedModule.persistence?.migrationName ?? "v1"})
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Owned Tables:</span>
                            <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px]">
                              {(selectedModule.persistence?.tables ?? []).map((t) => (
                                <span className="rounded bg-muted px-1.5 py-0.5" key={t}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Events & Routes */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <span className="font-semibold text-muted-foreground">API Routes</span>
                        <div className="mt-1 flex flex-col gap-1 font-mono">
                          {(selectedModule.apiRoutes ?? []).length === 0 ? (
                            <span className="text-muted-foreground">No public routes</span>
                          ) : (
                            selectedModule.apiRoutes!.map((r) => <span key={r}>{r}</span>)
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <span className="font-semibold text-muted-foreground">Audit Outbox Topics</span>
                        <div className="mt-1 flex flex-col gap-1 font-mono">
                          {(selectedModule.persistence?.outboxTopics ?? []).map((topic) => (
                            <span key={topic}>{topic}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    Select a module from the tree to inspect details.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Contracts */}
          {activeDetailTab === "contracts" && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Public Host & Application Contracts</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Only public contracts declared by this application are exposed for cross-module consumption. Private imports are strictly prohibited.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {selectedAppDetail.modules.flatMap((m) => m.publicContracts).length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground">No public contracts exposed.</div>
                ) : (
                  selectedAppDetail.modules
                    .flatMap((m) => m.publicContracts)
                    .map((contract, i) => (
                      <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-xs font-mono" key={i}>
                        <span className="font-semibold text-foreground">{contract}</span>
                        <span className="rounded bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">Public Contract</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* TAB: Runtime */}
          {activeDetailTab === "runtime" && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Application Runtime Services</h3>
              <div className="grid gap-3">
                {selectedAppDetail.runtimeServices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No independent runtime daemon for this application.</p>
                ) : (
                  selectedAppDetail.runtimeServices.map((svc) => (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4" key={svc.id}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{svc.name}</h4>
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                            {svc.status}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{svc.serviceUrl ?? svc.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {svc.canRestart && (
                          <button
                            className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent focus:ring-1 focus:ring-ring focus:outline-none"
                            onClick={() => handleRuntimeAction(svc.id, "restart")}
                          >
                            Restart
                          </button>
                        )}
                        {svc.canStop && (
                          <button
                            className="cursor-pointer rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 focus:ring-1 focus:ring-ring focus:outline-none"
                            onClick={() => handleRuntimeAction(svc.id, "stop")}
                          >
                            Stop
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: Security */}
          {activeDetailTab === "security" && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Security & Permissions</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Declared Permissions:</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedAppDetail.declaredPermissions.map((perm) => (
                      <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs" key={perm}>
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Data */}
          {activeDetailTab === "data" && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Persistence & Data Boundaries</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                All database credentials and secrets are masked by host policy.
              </p>
              <div className="mt-4 grid gap-3">
                {selectedAppDetail.modules.map((m) => (
                  <div className="rounded-lg border border-border bg-background p-3 text-xs" key={m.id}>
                    <span className="font-semibold text-foreground">{m.name}</span>
                    <div className="mt-2 flex items-center justify-between text-muted-foreground">
                      <span>Tables: {(m.persistence?.tables ?? []).join(", ") || "None"}</span>
                      <span>Ledger: {m.persistence?.migrationLedgerStatus ?? "applied"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: Applications Landing Page */}
      {!selectedAppId && activeTab === "applications" && (
        <div className="flex flex-col gap-6">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                aria-label="Search applications"
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                placeholder="Search applications or owner..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Filter:</span>
              {(["all", "active", "disabled"] as const).map((filter) => (
                <button
                  aria-pressed={filterState === filter}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors focus:ring-1 focus:ring-ring focus:outline-none ${
                    filterState === filter
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                  key={filter}
                  onClick={() => setFilterState(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No applications match your filter.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredApplications.map((app) => (
                <article
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80 hover:shadow"
                  key={app.id}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-foreground">{app.name}</h3>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            v{app.version}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{app.id}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          app.state === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {app.state === "active" ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{app.description}</p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs">
                    <span className="text-muted-foreground">Owner: {app.owner}</span>
                    <button
                      className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:outline-none"
                      onClick={() => handleSelectApp(app.id)}
                    >
                      Drill Down
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: Structures (Composition Graph) */}
      {!selectedAppId && activeTab === "structures" && overview && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Platform Composition Graph</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Source-of-truth composition graph: Framework → Platform Host → Identity Foundation → Optional Tenant Add-on → Applications → Modules.
            </p>
            <div className="mt-6 flex flex-col gap-4">
              {overview.structures.map((rootNode) => (
                <StructureNodeView key={rootNode.id} node={rootNode} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Runtime Services */}
      {!selectedAppId && activeTab === "runtime" && overview && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Independent Runtime Services</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Service status, restart/recovery state, and safe host action controls. No browser shell execution.
            </p>
            <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-background">
              {overview.runtimeServices.map((svc) => (
                <div className="flex items-center justify-between p-4" key={svc.id}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{svc.name}</h4>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                        {svc.status}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{svc.serviceUrl ?? svc.id}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Recovery: {svc.restartRecoveryState} • Last Health: {svc.lastHealthResult.status} ({svc.lastHealthResult.timestamp.slice(11, 19)})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {svc.canRestart && (
                      <button
                        className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent focus:ring-1 focus:ring-ring focus:outline-none"
                        onClick={() => handleRuntimeAction(svc.id, "restart")}
                      >
                        Restart
                      </button>
                    )}
                    {svc.canStop && (
                      <button
                        className="cursor-pointer rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 focus:ring-1 focus:ring-ring focus:outline-none"
                        onClick={() => handleRuntimeAction(svc.id, "stop")}
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Data Boundaries */}
      {!selectedAppId && activeTab === "data" && overview && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Persistence & Data Boundaries</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Module-owned tables, migration ledgers, and outbox topics. Secrets and credentials are never exposed.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {overview.dataBoundaries.map((db) => (
              <div className="rounded-xl border border-border bg-background p-4 text-xs" key={db.moduleId}>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{db.moduleName}</h4>
                  <span className="font-mono text-muted-foreground">{db.moduleId}</span>
                </div>
                <div className="mt-3 flex flex-col gap-1.5 text-muted-foreground">
                  <div>Database Provider: <span className="font-medium capitalize text-foreground">{db.databaseProvider}</span></div>
                  <div>Migration Ledger: <span className="font-medium text-foreground">{db.migrationName ?? "v1"} ({db.migrationLedgerStatus})</span></div>
                  <div>Outbox Topics: <span className="font-mono text-foreground">{db.outboxTopics.join(", ")}</span></div>
                  <div className="mt-1">
                    <span>Owned Tables:</span>
                    <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px] text-foreground">
                      {db.tables.map((t) => (
                        <span className="rounded bg-muted px-1.5 py-0.5" key={t}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Security Matrix */}
      {!selectedAppId && activeTab === "security" && overview && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Security & Authorization Matrix</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enforced permission barriers, host capabilities, and context requirements across the platform.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {overview.securityBoundaries.map((sec) => (
              <div className="rounded-xl border border-border bg-background p-4 text-xs" key={sec.id}>
                <h4 className="font-semibold text-foreground">{sec.name}</h4>
                <p className="mt-0.5 font-mono text-muted-foreground">{sec.declaredBy}</p>
                <div className="mt-3 flex flex-col gap-1.5 text-muted-foreground">
                  <div>Identity: <span className="capitalize text-foreground">{sec.identityRequirement}</span></div>
                  <div>Entitlement: <span className="capitalize text-foreground">{sec.entitlementRequirement}</span></div>
                  <div>Tenancy Context: <span className="capitalize text-foreground">{sec.tenantContextRequirement}</span></div>
                  <div className="mt-1">
                    <span>Required Permissions:</span>
                    <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px] text-foreground">
                      {sec.requiredPermissions.map((p) => (
                        <span className="rounded bg-muted px-1.5 py-0.5" key={p}>{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StructureNodeView({ node, depth = 0 }: { node: StructureNodeDTO; depth?: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`flex flex-col rounded-xl border border-border bg-card p-3 ${depth > 0 ? "ml-4 mt-2" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {node.children && node.children.length > 0 && (
            <button
              className="cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          <span className="font-medium text-foreground">{node.name}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {node.type}
          </span>
          {node.isTenantAware && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Tenant-Aware
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{node.owner}</span>
      </div>

      {node.errorDetails && node.errorDetails.length > 0 && (
        <div className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          {node.errorDetails.join("; ")}
        </div>
      )}

      {expanded && node.children && node.children.length > 0 && (
        <div className="mt-2 flex flex-col border-l border-border pl-2">
          {node.children.map((child) => (
            <StructureNodeView depth={depth + 1} key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
