import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/ui/input";
import {
  Bot,
  Check,
  ChevronDown,
  Cpu,
  Key,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  FALLBACK_MODELS,
  FALLBACK_PROVIDERS,
  getZxaModels,
  getZxaProviders,
  saveZxaProvider,
  type ProviderId,
  type ZxaModelOption,
  type ZxaProvider,
} from "../model-provider-api.js";
import { zetroNotifications } from "../notifications.js";

const PROVIDER_METADATA: Record<
  ProviderId,
  { name: string; icon: typeof Sparkles; defaultModel: string; badge?: string }
> = {
  g: { name: "Gemini", icon: Sparkles, defaultModel: "gemini-2.5-pro", badge: "Google Code Assist" },
  o: { name: "OpenCode", icon: Cpu, defaultModel: "opencode/nemotron-3-ultra-free", badge: "Free LLM" },
  c: { name: "Codex", icon: Bot, defaultModel: "account default", badge: "OpenAI" },
};

export type ModelProviderSelectorProps = {
  activeProvider: ProviderId;
  activeModel: string;
  onSelect: (provider: ProviderId, model: string) => void;
  sending?: boolean;
  queuedCount?: number;
  statusText?: string;
  className?: string;
};

export function ModelProviderSelector({
  activeProvider,
  activeModel,
  onSelect,
  sending = false,
  queuedCount = 0,
  statusText,
  className = "",
}: ModelProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const [viewedProvider, setViewedProvider] = useState<ProviderId>(activeProvider);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const queryClient = useQueryClient();

  // Sync viewed provider tab with active provider when popover opens
  useEffect(() => {
    if (open) {
      setViewedProvider(activeProvider);
      setShowConfig(false);
      setApiKeyInput("");
    }
  }, [open, activeProvider]);

  // Query live providers from ZXA
  const providersQuery = useQuery({
    queryKey: ["zxa-providers"],
    queryFn: getZxaProviders,
    staleTime: 10_000,
  });

  // Query live models for the viewed provider
  const modelsQuery = useQuery({
    queryKey: ["zxa-models", viewedProvider],
    queryFn: () => getZxaModels(viewedProvider),
    staleTime: 30_000,
  });

  const providers: ZxaProvider[] = providersQuery.data?.providers ?? FALLBACK_PROVIDERS;
  const currentProviderConfig = providers.find((p) => p.id === viewedProvider);
  const activeProviderConfig = providers.find((p) => p.id === activeProvider);

  const availableModels: ZxaModelOption[] =
    modelsQuery.data?.models && modelsQuery.data.models.length > 0
      ? modelsQuery.data.models
      : FALLBACK_MODELS[viewedProvider];

  // Mutation to connect / configure provider
  const connectMutation = useMutation({
    mutationFn: (payload: { apiKey?: string; model?: string; enabled?: boolean }) =>
      saveZxaProvider(viewedProvider, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["zxa-providers"] });
      void queryClient.invalidateQueries({ queryKey: ["zxa-models", viewedProvider] });
      setShowConfig(false);
      setApiKeyInput("");
      zetroNotifications.success(
        `Connected to ${PROVIDER_METADATA[viewedProvider].name}`
      );
    },
    onError: (err: any) => {
      zetroNotifications.error(err, "Could not update connection.");
    },
  });

  const handleSelectModel = (modelId: string) => {
    onSelect(viewedProvider, modelId);
    // Background sync to ZXA
    void saveZxaProvider(viewedProvider, { model: modelId }).catch(() => {});
    setOpen(false);
    zetroNotifications.info(
      `Using ${PROVIDER_METADATA[viewedProvider].name} · ${modelId}`
    );
  };

  const handleConnectFreeOpenCode = () => {
    connectMutation.mutate({
      apiKey: "free",
      enabled: true,
      model: "opencode/nemotron-3-ultra-free",
    });
    onSelect("o", "opencode/nemotron-3-ultra-free");
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    connectMutation.mutate({
      apiKey: apiKeyInput.trim(),
      enabled: true,
      model: viewedProvider === "g" ? "gemini-2.5-pro" : undefined,
    });
  };

  // Helper formatting for short model names in the pill
  const shortModelName = activeModel
    .replace(/^opencode\//, "")
    .replace(/^models\//, "")
    .replace("-preview", " prev")
    .replace("-free", "");

  const ActiveIcon = PROVIDER_METADATA[activeProvider].icon;
  const isConfigured = activeProviderConfig?.configured ?? true;

  if (sending) {
    return (
      <span
        role="status"
        className={`inline-flex items-center gap-1.5 text-xs text-primary font-medium select-none ${className}`}
      >
        <Loader2 className="size-3 animate-spin text-primary" />
        {statusText || `Asking ${PROVIDER_METADATA[activeProvider].name} (${shortModelName})…`}
      </span>
    );
  }

  if (queuedCount > 0) {
    return (
      <span
        role="status"
        className={`text-xs text-amber-500 font-medium select-none ${className}`}
      >
        {`${queuedCount} ${queuedCount === 1 ? "message" : "messages"} waiting for your steer`}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select AI Model and Provider"
          title="Select AI Model Provider (Codex, Gemini, OpenCode)"
          className={`group flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
        >
          <span
            className={`size-1.5 rounded-full ${
              isConfigured ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <ActiveIcon className="size-3.5 text-primary/80 group-hover:text-primary transition-colors" />
          <span className="font-medium text-foreground">
            {PROVIDER_METADATA[activeProvider].name}
          </span>
          <span className="text-muted-foreground/80 font-mono text-[11px] truncate max-w-[130px]">
            · {shortModelName}
          </span>
          <ChevronDown className="size-3 text-muted-foreground/70 group-hover:text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-96 p-0 shadow-lg border-border/80 bg-card text-card-foreground rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <ActiveIcon className="size-4 text-primary" />
            <div>
              <h4 className="text-xs font-semibold leading-none">ZXA Model Provider</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Isolated Docker agent runtime
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Refresh models"
            onClick={() => {
              void providersQuery.refetch();
              void modelsQuery.refetch();
            }}
          >
            <RefreshCw
              className={`size-3.5 ${
                providersQuery.isFetching || modelsQuery.isFetching ? "animate-spin" : ""
              }`}
            />
          </Button>
        </div>

        {/* Provider Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-muted/30 border-b border-border/50">
          {(["g", "o", "c"] as ProviderId[]).map((pid) => {
            const meta = PROVIDER_METADATA[pid];
            const pcfg = providers.find((p) => p.id === pid);
            const isTabActive = viewedProvider === pid;
            const isSelected = activeProvider === pid;
            const Icon = meta.icon;

            return (
              <button
                key={pid}
                type="button"
                onClick={() => {
                  setViewedProvider(pid);
                  setShowConfig(false);
                }}
                className={`relative flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-left transition-all cursor-pointer ${
                  isTabActive
                    ? "bg-background text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3.5 text-primary" />
                  <span className="text-xs font-medium">{meta.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`size-1.5 rounded-full ${
                      pcfg?.configured ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                    {pcfg?.configured ? "Connected" : "Setup needed"}
                  </span>
                </div>
                {isSelected && (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Provider Status / Auth Summary */}
        <div className="px-3.5 py-2 bg-muted/10 border-b border-border/40 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground truncate">
            {currentProviderConfig?.connectedAs
              ? `Account: ${currentProviderConfig.connectedAs}`
              : currentProviderConfig?.configured
              ? "Connected in Docker runtime"
              : "Not connected in ZXA"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-primary hover:text-primary"
            onClick={() => setShowConfig((prev) => !prev)}
          >
            {showConfig ? "Hide setup" : "Configure"}
          </Button>
        </div>

        {/* Optional Quick Connect / Config Form */}
        {showConfig && (
          <div className="p-3 bg-muted/20 border-b border-border/50 text-xs space-y-2">
            {viewedProvider === "o" && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  OpenCode provides instant free AI models without an API key.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  onClick={handleConnectFreeOpenCode}
                  disabled={connectMutation.isPending}
                >
                  <Zap className="size-3.5 text-amber-500" />
                  Connect Free Built-in LLM
                </Button>
              </div>
            )}

            {viewedProvider === "g" && (
              <form onSubmit={handleSaveApiKey} className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Connect via Gemini API Key or use Google Account OAuth.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter Gemini API key..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={!apiKeyInput.trim() || connectMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
              </form>
            )}

            {viewedProvider === "c" && (
              <form onSubmit={handleSaveApiKey} className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Connect via OpenAI API Key or ChatGPT account.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter OpenAI API key..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={!apiKeyInput.trim() || connectMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Models List for Viewed Provider */}
        <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Available Models ({availableModels.length})
          </div>

          {availableModels.map((model) => {
            const isModelActive =
              activeProvider === viewedProvider && activeModel === model.id;

            return (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelectModel(model.id)}
                className={`w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                  isModelActive
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "hover:bg-muted/70 text-foreground"
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  {isModelActive ? (
                    <div className="size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="size-4 rounded-full border border-border" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{model.name}</span>
                    {model.id.includes("pro") && (
                      <span className="text-[9px] font-semibold uppercase px-1 rounded bg-primary/20 text-primary">
                        Flagship
                      </span>
                    )}
                    {model.id.includes("free") && (
                      <span className="text-[9px] font-semibold uppercase px-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        Free
                      </span>
                    )}
                  </div>
                  {model.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {model.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 bg-muted/40 border-t border-border/60 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground truncate">
            Active: <strong className="text-foreground">{PROVIDER_METADATA[activeProvider].name}</strong> · {shortModelName}
          </span>
          <span className="text-[10px] text-muted-foreground">ZXA Isolated</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
