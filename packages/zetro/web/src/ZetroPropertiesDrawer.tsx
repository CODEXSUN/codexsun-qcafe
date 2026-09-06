import { useEffect, useState } from "react";
import { Bot, Container, FolderGit2, GitBranch, Laptop, Palette, RefreshCw, Server } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { Input } from "@codexsun/ui/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@codexsun/ui/components/ui/sheet";
import { Switch } from "@codexsun/ui/components/ui/switch";
import {
  ThemeModeSelector,
  designSystemVariants,
  getCurrentDesignSystemVariantId,
  setDesignSystemVariantId,
  type DesignSystemVariantId
} from "@codexsun/ui";
import { getZetroAgents, getZetroSettings, saveZetroSettings, type ZetroSettings } from "./settings-api.js";
import { ZETRO_AGENT_RUNTIMES } from "./agent-runtimes.js";
import { zetroNotifications } from "./notifications.js";

export function ZetroPropertiesDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["zetro-settings"], queryFn: getZetroSettings, enabled: open, retry: 1, refetchOnMount: "always" });
  const agents = useQuery({ queryKey: ["zetro-agents"], queryFn: getZetroAgents, enabled: open, refetchInterval: open ? 10_000 : false });
  const [draft, setDraft] = useState<ZetroSettings | null>(null);
  const [variantId, setVariantId] = useState<DesignSystemVariantId>(() => getCurrentDesignSystemVariantId());
  const save = useMutation({
    mutationFn: saveZetroSettings,
    onSuccess: (value) => {
      queryClient.setQueryData(["zetro-settings"], value);
      void queryClient.invalidateQueries({ queryKey: ["zetro-workspace-folders"] });
      void queryClient.invalidateQueries({ queryKey: ["zxa-providers"] });
      void queryClient.invalidateQueries({ queryKey: ["zxa-models"] });
      void queryClient.invalidateQueries({ queryKey: ["zetro-agents"] });
      window.dispatchEvent(new CustomEvent("zetro-settings-updated", { detail: value }));
      onOpenChange(false);
      zetroNotifications.success("Zetro properties saved");
    },
    onError: (cause) => zetroNotifications.error(cause, "Unable to save Zetro properties."),
  });
  useEffect(() => { if (settings.data) setDraft(settings.data); }, [settings.data]);

  function handleVariantChange(id: DesignSystemVariantId) {
    setVariantId(id);
    setDesignSystemVariantId(id);
  }

  function setAgentEnabled(id: string, enabled: boolean) {
    if (!draft) return;
    const enabledAgentIds = enabled ? [...new Set([...draft.enabledAgentIds, id])] : draft.enabledAgentIds.filter((item) => item !== id);
    const defaultAgentId = enabledAgentIds.includes(draft.defaultAgentId) ? draft.defaultAgentId : enabledAgentIds[0] ?? draft.defaultAgentId;
    setDraft({ ...draft, enabledAgentIds, defaultAgentId });
  }

  async function refreshSettings() {
    const result = await settings.refetch();
    if (result.error) zetroNotifications.error(result.error, "Zetro Desk configuration is unavailable.");
    else zetroNotifications.success("Zetro configuration loaded");
  }

  async function refreshAgents() {
    const result = await agents.refetch();
    if (result.error) zetroNotifications.error(result.error, "Connected agents could not be loaded.");
    else zetroNotifications.info("Agent status refreshed");
  }

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-[min(92vw,28rem)] flex-col gap-0 bg-card p-0 sm:max-w-md">
      <SheetHeader className="border-b border-border px-6 py-5 pr-12">
        <SheetTitle>Zetro properties</SheetTitle>
        <SheetDescription>Connect project context and choose where Zetro sends provider requests.</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-5">
        {!draft && (settings.isError ? <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
          <p className="text-sm text-muted-foreground">Zetro Desk configuration is unavailable.</p>
          <Button type="button" variant="outline" size="sm" className="shrink-0 cursor-pointer" onClick={() => void refreshSettings()}>Retry</Button>
        </div> : <GlobalLoader className="min-h-64" fullScreen={false} />)}
        {draft && <>
          <section className="space-y-3">
            <div className="flex items-center gap-2"><FolderGit2 className="size-4" /><h3 className="text-sm font-semibold">Repository</h3></div>
            <Field label="Repository root" help="Absolute local folder exposed to Zetro projects."><Input value={draft.repositoryRoot} onChange={(event) => setDraft({ ...draft, repositoryRoot: event.target.value })} placeholder="E:/Workspace/project" /></Field>
            <Field label="GitHub URL" help="Optional remote used for project context and future reviewed Git operations."><div className="relative"><GitBranch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" type="url" value={draft.githubUrl} onChange={(event) => setDraft({ ...draft, githubUrl: event.target.value })} placeholder="https://github.com/owner/repository" /></div></Field>
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2"><Container className="size-4" /><h3 className="text-sm font-semibold">Execution target</h3></div>
            <div className="grid gap-2">
              {RUNTIME_TARGETS.map((target) => {
                const Icon = target.icon;
                const selected = draft.runtimeTarget === target.id;
                return <button key={target.id} type="button" aria-pressed={selected} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-accent"}`} onClick={() => setDraft({ ...draft, runtimeTarget: target.id })}>
                  <Icon className={`mt-0.5 size-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="min-w-0"><span className="block text-sm font-medium">{target.name}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{target.description}</span></span>
                  <span className={`ml-auto mt-1 size-3 shrink-0 rounded-full border ${selected ? "border-primary bg-primary shadow-[inset_0_0_0_3px_hsl(var(--background))]" : "border-muted-foreground/50"}`} />
                </button>;
              })}
            </div>
            {draft.runtimeTarget === "docker-vps" && <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
              <Field label="VPS ZXA URL" help="Public HTTPS base URL routed to the VPS ZXA container."><Input type="url" value={draft.vpsAgentUrl} onChange={(event) => setDraft({ ...draft, vpsAgentUrl: event.target.value })} placeholder="https://agent.example.com" /></Field>
              <Field label="VPS access token" help={draft.hasVpsAgentToken ? "A token is saved in Windows Credential Manager. Enter a value only to replace it." : "Stored in Windows Credential Manager. The token is not written to project settings."}><Input type="password" value={draft.vpsAgentToken ?? ""} onChange={(event) => setDraft({ ...draft, vpsAgentToken: event.target.value })} placeholder={draft.hasVpsAgentToken ? "Saved token" : "Enter ZXA access token"} /></Field>
            </div>}
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Bot className="size-4" /><h3 className="text-sm font-semibold">Agent connection</h3></div><Button type="button" variant="ghost" size="icon" className="size-8 cursor-pointer" aria-label="Refresh agents" title="Refresh agents" onClick={() => void refreshAgents()}><RefreshCw className={`size-4 ${agents.isFetching ? "animate-spin" : ""}`} /></Button></div>
            <div className="space-y-2">
              {agents.data?.map((agent) => {
                const enabled = draft.enabledAgentIds.includes(agent.id);
                return <article key={agent.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{agent.name}</p><span className={`size-2 shrink-0 rounded-full ${agent.runtimeStatus === "healthy" ? "bg-emerald-500" : agent.runtimeStatus === "offline" ? "bg-amber-500" : "bg-muted-foreground/40"}`} /></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{agent.duty}</p><p className="mt-1 text-[11px] text-muted-foreground">{agent.runtimeStatus ?? "unknown"} · {agent.mode ?? "Docker"}</p></div><Switch checked={enabled} disabled={!agent.configured || (enabled && draft.enabledAgentIds.length === 1)} onCheckedChange={(checked) => setAgentEnabled(agent.id, checked)} aria-label={`Enable ${agent.name}`} /></div>
                </article>;
              })}
              {agents.error && <p className="text-xs text-destructive">Connected agents could not be loaded.</p>}
            </div>
            <Field label="Default agent" help="New prompts are sent to this enabled agent."><select className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.defaultAgentId} onChange={(event) => setDraft({ ...draft, defaultAgentId: event.target.value })}>{agents.data?.filter((agent) => draft.enabledAgentIds.includes(agent.id)).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></Field>
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2"><Palette className="size-4" /><h3 className="text-sm font-semibold">Appearance & Theme</h3></div>
            <p className="text-xs text-muted-foreground">Select color scheme and design variant for Zetro workspace.</p>
            <ThemeModeSelector showAdvanced={false} />
            <Field label="Design system variant" help="Select active brand palette and density tokens.">
              <select className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={variantId} onChange={(event) => handleVariantChange(event.target.value as DesignSystemVariantId)}>
                {designSystemVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.name} ({variant.density})</option>
                ))}
              </select>
            </Field>
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2"><Bot className="size-4" /><h3 className="text-sm font-semibold">Agent runtime scaffold</h3></div>
            <div className="space-y-2">{ZETRO_AGENT_RUNTIMES.map((runtime) => <article className="rounded-xl border border-border bg-background p-3" key={runtime.id}><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{runtime.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${runtime.state === "available" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{runtime.state === "available" ? "Reference ready" : "Planned"}</span></div><div className="mt-2 flex flex-wrap gap-1">{runtime.providers.map((provider) => <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground" key={provider}>{provider}</span>)}</div></article>)}</div>
          </section>
        </>}
        {save.error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{save.error.message}</p>}
      </div>
      <SheetFooter className="border-t border-border px-6 py-4">
        <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="button" className="cursor-pointer" disabled={!draft || save.isPending || draft.enabledAgentIds.length === 0 || (draft.runtimeTarget === "docker-vps" && (!draft.vpsAgentUrl.trim() || (!draft.hasVpsAgentToken && !draft.vpsAgentToken?.trim())))} onClick={() => draft && save.mutate(draft)}>{save.isPending ? "Saving…" : "Save properties"}</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>;
}

const RUNTIME_TARGETS = [
  { id: "local" as const, name: "Local CLI", description: "Use the signed-in Codex CLI for chat-only, read-only requests on this computer.", icon: Laptop },
  { id: "docker-local" as const, name: "Local Docker", description: "Use the isolated ZXA container and its separate Codex, Gemini, and OpenCode connections.", icon: Container },
  { id: "docker-vps" as const, name: "VPS Docker", description: "Use an HTTPS ZXA container on your VPS with its own access token.", icon: Server },
];

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-foreground">{label}</span>{children}<span className="block text-[11px] leading-4 text-muted-foreground">{help}</span></label>;
}
