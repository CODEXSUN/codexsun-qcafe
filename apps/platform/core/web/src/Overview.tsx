import { House } from "lucide-react";
import { createPortal } from "react-dom";
import { MdiTopologyRegion, type MdiWorkspaceAddon, type MdiTopologyAdapter } from "@codexsun/ui-desk";

export const overviewPage = { view: "workspace", addonId: "overview", pageId: "welcome" } as const;

export const overviewWorkspace: MdiWorkspaceAddon = {
  id: "overview",
  label: "Overview",
  icon: House,
  navigation: {
    id: "overview",
    hideSearch: true,
    searchPlaceholder: "Platform overview",
    groups: [{ id: "platform", title: "CODEXSUN OS", defaultOpen: true, items: [{ id: "welcome", title: "Overview" }] }],
  },
  renderPage: (_page, topology, target) => <Overview topology={topology} target={target} />,
};

function Overview({ topology, target }: { topology?: MdiTopologyAdapter; target?: HTMLElement | null }) {
  return <MdiTopologyRegion id="15" topology={topology} className="h-full overflow-y-auto bg-background text-foreground">
    {target && createPortal(<MdiTopologyRegion id="11.1.1" topology={topology} className="space-y-3"><h2 className="px-2 text-xs font-semibold text-muted-foreground">CODEXSUN OS</h2><MdiTopologyRegion id="11.1.1.1" topology={topology}><a href="/" aria-current="page" className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-3 py-3 text-sm text-accent-foreground"><House size={16} />Overview</a></MdiTopologyRegion></MdiTopologyRegion>, target)}
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12 sm:px-10 sm:py-20">
      <MdiTopologyRegion id="15.1" topology={topology} className="flex flex-col gap-5">
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-foreground"><House aria-hidden="true" size={24} /></span>
        <p className="text-sm font-medium tracking-widest text-muted-foreground">PLATFORM OVERVIEW</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Welcome to CODEXSUN OS</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">Your home desk for navigating workspaces, managing platform preferences, and keeping your work in one place.</p>
      </MdiTopologyRegion>
      <div className="grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
        <MdiTopologyRegion id="15.2" topology={topology} className="flex flex-col gap-3"><h2 className="text-lg font-semibold">Start from your desk</h2><p className="leading-relaxed text-muted-foreground">Use the side menu to select a workspace. Choose Overview whenever you want to return to this welcome page.</p></MdiTopologyRegion>
        <MdiTopologyRegion id="15.3" topology={topology} className="flex flex-col gap-3"><h2 className="text-lg font-semibold">One platform, clear ownership</h2><p className="leading-relaxed text-muted-foreground">CODEXSUN OS owns this desk and its navigation. Each connected workspace keeps its own tools and data.</p></MdiTopologyRegion>
      </div>
    </section>
  </MdiTopologyRegion>;
}
