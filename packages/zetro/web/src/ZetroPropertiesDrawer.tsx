import { useEffect, useState } from "react";
import { Bot, FolderGit2, GitBranch, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@codexsun/ui/components/ui/sheet";
import { Switch } from "@codexsun/ui/components/ui/switch";
import { getZetroAgents, getZetroSettings, saveZetroSettings, type ZetroSettings } from "./settings-api.js";
import { ZETRO_AGENT_RUNTIMES } from "./agent-runtimes.js";

export function ZetroPropertiesDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["zetro-settings"], queryFn: getZetroSettings, enabled: open, retry: 1, refetchOnMount: "always" });
  const agents = useQuery({ queryKey: ["zetro-agents"], queryFn: getZetroAgents, enabled: open, refetchInterval: open ? 10_000 : false });
  const [draft, setDraft] = useState<ZetroSettings | null>(null);
  const save = useMutation({
    mutationFn: saveZetroSettings,
    onSuccess: (value) => {
      queryClient.setQueryData(["zetro-settings"], value);
      void queryClient.invalidateQueries({ queryKey: ["zetro-workspace-folders"] });
      window.dispatchEvent(new CustomEvent("zetro-settings-updated", { detail: value }));
      onOpenChange(false);
    },
  });
  useEffect(() => { if (settings.data) setDraft(settings.data); }, [settings.data]);

  function setAgentEnabled(id: string, enabled: boolean) {
    if (!draft) return;
    const enabledAgentIds = enabled ? [...new Set([...draft.enabledAgentIds, id])] : draft.enabledAgentIds.filter((item) => item !== id);
    const defaultAgentId = enabledAgentIds.includes(draft.defaultAgentId) ? draft.defaultAgentId : enabledAgentIds[0] ?? draft.defaultAgentId;
    setDraft({ ...draft, enabledAgentIds, defaultAgentId });
  }

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-[min(92vw,28rem)] flex-col gap-0 bg-card p-0 sm:max-w-md">
      <SheetHeader className="border-b border-border px-6 py-5 pr-12">
        <SheetTitle>Zetro properties</SheetTitle>
        <SheetDescription>Connect local project context and choose the Docker agents Zetro can use.</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-5">
        {!draft && <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
          <p className="text-sm text-muted-foreground">{settings.isError ? "Zetro Desk configuration is unavailable." : "Loading Zetro configuration…"}</p>
          {settings.isError && <Button type="button" variant="outline" size="sm" className="shrink-0 cursor-pointer" onClick={() => void settings.refetch()}>Retry</Button>}
        </div>}
        {draft && <>
          <section className="space-y-3">
            <div className="flex items-center gap-2"><FolderGit2 className="size-4" /><h3 className="text-sm font-semibold">Repository</h3></div>
            <Field label="Repository root" help="Absolute local folder exposed to Zetro projects."><Input value={draft.repositoryRoot} onChange={(event) => setDraft({ ...draft, repositoryRoot: event.target.value })} placeholder="E:/Workspace/project" /></Field>
            <Field label="GitHub URL" help="Optional remote used for project context and future reviewed Git operations."><div className="relative"><GitBranch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" type="url" value={draft.githubUrl} onChange={(event) => setDraft({ ...draft, githubUrl: event.target.value })} placeholder="https://github.com/owner/repository" /></div></Field>
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Bot className="size-4" /><h3 className="text-sm font-semibold">Docker agents</h3></div><Button type="button" variant="ghost" size="icon" className="size-8 cursor-pointer" aria-label="Refresh agents" title="Refresh agents" onClick={() => void agents.refetch()}><RefreshCw className={`size-4 ${agents.isFetching ? "animate-spin" : ""}`} /></Button></div>
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
            <div className="flex items-center gap-2"><Bot className="size-4" /><h3 className="text-sm font-semibold">Agent runtime scaffold</h3></div>
            <div className="space-y-2">{ZETRO_AGENT_RUNTIMES.map((runtime) => <article className="rounded-xl border border-border bg-background p-3" key={runtime.id}><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{runtime.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${runtime.state === "available" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{runtime.state === "available" ? "Reference ready" : "Planned"}</span></div><div className="mt-2 flex flex-wrap gap-1">{runtime.providers.map((provider) => <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground" key={provider}>{provider}</span>)}</div></article>)}</div>
          </section>
        </>}
        {save.error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{save.error.message}</p>}
      </div>
      <SheetFooter className="border-t border-border px-6 py-4">
        <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="button" className="cursor-pointer" disabled={!draft || save.isPending || draft.enabledAgentIds.length === 0} onClick={() => draft && save.mutate(draft)}>{save.isPending ? "Saving…" : "Save properties"}</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>;
}

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-foreground">{label}</span>{children}<span className="block text-[11px] leading-4 text-muted-foreground">{help}</span></label>;
}
