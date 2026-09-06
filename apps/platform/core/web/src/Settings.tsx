import { Boxes, CheckCircle2, KeyRound, Network, Palette, Settings2 } from "lucide-react";
import { createPortal } from "react-dom";
import { MdiTopologyRegion, type MdiTopologyAdapter, type MdiWorkspaceAddon } from "@codexsun/ui-desk";
import { ChatConnectionSettings } from "@codexsun/chat-web";
import { DevicesPanel } from "@codexsun/dcs-web";
import { desktopCredentialStore } from "@codexsun/core-desktop";
import { useIdentitySession } from "@codexsun/identity-web";
import { Button } from "@codexsun/ui/components/button";
import { ThemeModeSelector } from "@codexsun/ui";
import { AppRegistryWorkspace } from "./modules/app-registry/index.js";
import { DesignSystemGallery } from "./modules/design-system/index.js";

type Application = { id: string; name: string; webUrl?: string };

export function createSettingsWorkspace(applications: Application[]): MdiWorkspaceAddon {
  return {
    icon: Settings2,
    id: "settings",
    label: "Settings",
    placement: "utility",
    navigation: { id: "settings", hideSearch: true, searchPlaceholder: "Search settings", groups: [{ defaultOpen: true, id: "platform", items: [{ id: "applications", title: "Applications" }, { id: "appearance", title: "Appearance & Themes" }, { id: "architecture", title: "Architecture" }, { id: "connections", title: "Connections" }, { id: "identity", title: "Identity" }, { id: "runtime", title: "Runtime" }], title: "Platform" }] },
    renderPage: (pageId, topology, target) => <SettingsPage applications={applications} pageId={pageId} target={target} topology={topology} />,
  };
}

function SettingsPage({ applications, pageId, target, topology }: { applications: Application[]; pageId: string; target?: HTMLElement | null; topology?: MdiTopologyAdapter }) {
  const title = pageId === "architecture" ? "Project Architecture & Structures" : pageId === "appearance" ? "Appearance & Design Themes" : pageId === "connections" ? "Connections" : pageId === "identity" ? "Identity" : pageId === "runtime" ? "Runtime" : "Applications";
  const pages = ["applications", "appearance", "architecture", "connections", "identity", "runtime"];
  return <MdiTopologyRegion className="h-full overflow-y-auto bg-background text-foreground" id="s1" topology={topology}>
    {target && createPortal(<MdiTopologyRegion id="s2.1" topology={topology} className="space-y-2 px-2 py-3"><p className="px-2 text-xs font-semibold text-muted-foreground">PLATFORM SETTINGS</p>{pages.map((item, index) => <MdiTopologyRegion id={`s2.1.${index + 1}`} topology={topology} key={item}><a aria-current={item === pageId ? "page" : undefined} className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${item === pageId ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`} href={`/?app=settings&addon=settings&page=${item}`}>{item === "applications" ? <Boxes size={16} /> : item === "appearance" ? <Palette size={16} /> : item === "architecture" ? <Network size={16} /> : item === "connections" ? <KeyRound size={16} /> : <Settings2 size={16} />}{item === "architecture" ? "Architecture" : item === "appearance" ? "Appearance" : item[0]!.toUpperCase() + item.slice(1)}</a></MdiTopologyRegion>)}</MdiTopologyRegion>, target)}
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-10">
      <MdiTopologyRegion id="s3" topology={topology} className="space-y-3"><span className="flex size-11 items-center justify-center rounded-xl border border-border bg-card">{pageId === "architecture" ? <Network size={21} /> : pageId === "appearance" ? <Palette size={21} /> : <Settings2 size={21} />}</span><p className="text-sm font-medium tracking-widest text-muted-foreground">PLATFORM SETTINGS</p><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="max-w-2xl text-muted-foreground">{pageId === "architecture" ? "Drill-down architectural registry for platform applications, modules, contracts, dependencies, and boundaries." : pageId === "appearance" ? "Manage CODEXSUN design system themes, variant densities, component defaults, and UI options." : pageId === "applications" ? "Manage the applications registered with this Platform host." : pageId === "connections" ? "Connect desktop workspaces to local module APIs." : "This setting area is ready for the shared Platform engine."}</p></MdiTopologyRegion>
      {pageId === "applications" && <MdiTopologyRegion id="s4" topology={topology} className="grid gap-3">{applications.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No applications are currently registered.</div> : applications.map((application) => <article className="flex items-center justify-between rounded-xl border border-border bg-card p-5" key={application.id}><div className="min-w-0"><h2 className="font-medium">{application.name}</h2><p className="mt-1 font-mono text-xs text-muted-foreground">{application.id}</p></div><span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="text-foreground" size={16} />Available</span></article>)}</MdiTopologyRegion>}
      {pageId === "appearance" && (
        <MdiTopologyRegion id="s9" topology={topology} className="space-y-8">
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WORKSPACE COLOR SCHEME</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Theme Mode</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select your preferred color scheme for the CODEXSUN workspace. Choose between White theme, Dark theme, or automatically track your System theme.
              </p>
            </div>
            <ThemeModeSelector />
          </section>

          <DesignSystemGallery />
        </MdiTopologyRegion>
      )}
      {pageId === "architecture" && <MdiTopologyRegion id="s7" topology={topology}><AppRegistryWorkspace /></MdiTopologyRegion>}
      {pageId === "connections" && <MdiTopologyRegion id="s5" topology={topology}><ChatConnectionSettings /></MdiTopologyRegion>}
      {pageId === "identity" && <MdiTopologyRegion id="s8" topology={topology}><IdentitySettings /></MdiTopologyRegion>}
      {pageId === "runtime" && <MdiTopologyRegion id="s6" topology={topology}><DevicesPanel credentialStore={desktopCredentialStore("dcs-device")} /></MdiTopologyRegion>}
    </section>
  </MdiTopologyRegion>;
}

function IdentitySettings() {
  const identity = useIdentitySession();
  if (!identity.signedIn) return <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">This local workspace is not connected to a cloud identity session.</div>;
  return <article className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-end sm:justify-between">
    <div className="space-y-2"><p className="text-sm font-medium">Signed-in account</p><p className="text-sm text-muted-foreground">{identity.profile?.login ?? "CODEXSUN account"}</p><p className="text-xs text-muted-foreground">{identity.profile?.scope === "single-client" ? "Single-client workspace" : "Tenant workspace"}</p></div>
    <Button className="cursor-pointer" onClick={() => void identity.signOut()} variant="outline">Sign out</Button>
  </article>;
}
