import { Boxes, CheckCircle2, KeyRound, Settings2 } from "lucide-react";
import { createPortal } from "react-dom";
import { MdiTopologyRegion, type MdiTopologyAdapter, type MdiWorkspaceAddon } from "@codexsun/ui-desk";
import { ChatConnectionSettings } from "@codexsun/chat-web";
import { DevicesPanel } from "@codexsun/dcs-web";
import { desktopCredentialStore } from "@codexsun/core-desktop";

type Application = { id: string; name: string; webUrl?: string };

export function createSettingsWorkspace(applications: Application[]): MdiWorkspaceAddon {
  return {
    icon: Settings2,
    id: "settings",
    label: "Settings",
    placement: "utility",
    navigation: { id: "settings", hideSearch: true, searchPlaceholder: "Search settings", groups: [{ defaultOpen: true, id: "platform", items: [{ id: "applications", title: "Applications" }, { id: "connections", title: "Connections" }, { id: "identity", title: "Identity" }, { id: "runtime", title: "Runtime" }], title: "Platform" }] },
    renderPage: (pageId, topology, target) => <SettingsPage applications={applications} pageId={pageId} target={target} topology={topology} />,
  };
}

function SettingsPage({ applications, pageId, target, topology }: { applications: Application[]; pageId: string; target?: HTMLElement | null; topology?: MdiTopologyAdapter }) {
  const title = pageId === "connections" ? "Connections" : pageId === "identity" ? "Identity" : pageId === "runtime" ? "Runtime" : "Applications";
  const pages = ["applications", "connections", "identity", "runtime"];
  return <MdiTopologyRegion className="h-full overflow-y-auto bg-background text-foreground" id="s1" topology={topology}>
    {target && createPortal(<MdiTopologyRegion id="s2.1" topology={topology} className="space-y-2 px-2 py-3"><p className="px-2 text-xs font-semibold text-muted-foreground">PLATFORM SETTINGS</p>{pages.map((item, index) => <MdiTopologyRegion id={`s2.1.${index + 1}`} topology={topology} key={item}><a aria-current={item === pageId ? "page" : undefined} className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${item === pageId ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`} href={`/?app=settings&addon=settings&page=${item}`}>{item === "applications" ? <Boxes size={16} /> : item === "connections" ? <KeyRound size={16} /> : <Settings2 size={16} />}{item[0]!.toUpperCase() + item.slice(1)}</a></MdiTopologyRegion>)}</MdiTopologyRegion>, target)}
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-10">
      <MdiTopologyRegion id="s3" topology={topology} className="space-y-3"><span className="flex size-11 items-center justify-center rounded-xl border border-border bg-card"><Settings2 size={21} /></span><p className="text-sm font-medium tracking-widest text-muted-foreground">PLATFORM SETTINGS</p><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="max-w-2xl text-muted-foreground">{pageId === "applications" ? "Manage the applications registered with this Platform host." : pageId === "connections" ? "Connect desktop workspaces to local module APIs." : "This setting area is ready for the shared Platform engine."}</p></MdiTopologyRegion>
      {pageId === "applications" && <MdiTopologyRegion id="s4" topology={topology} className="grid gap-3">{applications.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No applications are currently registered.</div> : applications.map((application) => <article className="flex items-center justify-between rounded-xl border border-border bg-card p-5" key={application.id}><div className="min-w-0"><h2 className="font-medium">{application.name}</h2><p className="mt-1 font-mono text-xs text-muted-foreground">{application.id}</p></div><span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="text-foreground" size={16} />Available</span></article>)}</MdiTopologyRegion>}
      {pageId === "connections" && <MdiTopologyRegion id="s5" topology={topology}><ChatConnectionSettings /></MdiTopologyRegion>}
      {pageId === "runtime" && <MdiTopologyRegion id="s6" topology={topology}><DevicesPanel credentialStore={desktopCredentialStore("dcs-device")} /></MdiTopologyRegion>}
    </section>
  </MdiTopologyRegion>;
}
