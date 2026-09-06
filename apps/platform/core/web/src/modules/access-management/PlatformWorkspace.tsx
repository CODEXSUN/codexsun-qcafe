import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, KeyRound, Pencil, Plus, ShieldCheck, Users } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { MdiTopologyRegion, type MdiTopologyAdapter, type MdiWorkspaceAddon } from "@codexsun/ui-desk";
import { platformFetch } from "@codexsun/platform-host-contracts";

type Role = "administrator" | "manager" | "member" | "viewer";
type Permission = "app.access" | "identity.admin" | "installation.manage" | "devices.manage" | "chat.access" | "tasks.manage" | "zetro.access";
type Account = { applicationIds: string[]; id: string; login: string; permissions: Permission[]; responsibilities: string[]; role: Role; scope: "single-client"; status: "active" | "suspended" };
type AccountDraft = Omit<Account, "id"> & { password: string };

const roles: { key: Role; label: string }[] = [
  { key: "administrator", label: "Administrator" }, { key: "manager", label: "Manager" }, { key: "member", label: "Member" }, { key: "viewer", label: "Viewer" },
];
const permissions: Permission[] = ["app.access", "identity.admin", "installation.manage", "devices.manage", "chat.access", "tasks.manage", "zetro.access"];
const applications = ["app.zetro", "app.ai-task-system", "app.chat", "app.device-chat", "app.docs"];
const emptyDraft: AccountDraft = { applicationIds: [], login: "", password: "", permissions: ["app.access"], responsibilities: [], role: "member", scope: "single-client", status: "active" };

export const platformWorkspace: MdiWorkspaceAddon = {
  id: "platform",
  label: "Platform",
  icon: ShieldCheck,
  placement: "secondary",
  navigation: { id: "platform", hideSearch: true, searchPlaceholder: "Search platform administration", groups: [{ defaultOpen: true, id: "identity", title: "Platform", items: [{ id: "users", title: "Users & access" }] }] },
  renderPage: (_pageId, topology, target) => <AccessManagementWorkspace topology={topology} target={target} />,
};

function AccessManagementWorkspace({ topology, target }: { topology?: MdiTopologyAdapter; target?: HTMLElement | null }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [identityAvailable, setIdentityAvailable] = useState(false);
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);
  const load = useCallback(async () => {
    setBusy(true); setError(""); setIdentityAvailable(false);
    try {
      const health = await platformFetch("/health");
      const runtime = await health.json().catch(() => null) as { database?: string } | null;
      if (!health.ok || runtime?.database !== "configured") throw new Error("Identity administration requires a configured Platform database. Set DATABASE_URL before starting the local Platform API.");
      const response = await platformFetch("/api/v1/identity/accounts");
      if (response.status === 403) throw new Error("You need the Identity administrator permission to manage users.");
      if (!response.ok) throw new Error("Users could not be loaded.");
      setAccounts((await response.json() as { accounts: Account[] }).accounts);
      setIdentityAvailable(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Users could not be loaded."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save(draft: AccountDraft) {
    const response = await platformFetch(editing ? `/api/v1/identity/accounts/${editing.id}` : "/api/v1/identity/accounts", {
      body: JSON.stringify(draft), headers: { "content-type": "application/json" }, method: editing ? "PATCH" : "POST",
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null) as { error?: string } | null)?.error ?? "User could not be saved.");
    setEditing(undefined); await load();
  }
  return <MdiTopologyRegion id="p1" topology={topology} className="h-full overflow-y-auto bg-background text-foreground">
    {target && createPortal(<MdiTopologyRegion id="p2" topology={topology} className="space-y-1 px-2 py-3"><p className="px-2 text-xs font-semibold text-muted-foreground">PLATFORM</p><a aria-current="page" className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" href="/?app=platform&addon=platform&page=users"><Users size={16} />Users & access</a></MdiTopologyRegion>, target)}
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-10">
      <MdiTopologyRegion id="p3" topology={topology} className="flex flex-wrap items-end justify-between gap-4"><div className="space-y-3"><span className="flex size-11 items-center justify-center rounded-xl border border-border bg-card"><ShieldCheck size={21} /></span><p className="text-sm font-medium tracking-widest text-muted-foreground">PLATFORM ACCESS</p><h1 className="text-3xl font-semibold tracking-tight">Users, roles and access</h1><p className="max-w-2xl text-muted-foreground">Manage cloud users, their responsibilities, application access, and permissions. Access updates revoke the user’s existing sessions.</p></div><MdiTopologyRegion id="p3.1" topology={topology}><Button className="cursor-pointer" disabled={!identityAvailable} onClick={() => setEditing(null)} title={identityAvailable ? "Add user" : "Configure Platform persistence to manage users"}><Plus size={16} />Add user</Button></MdiTopologyRegion></MdiTopologyRegion>
      {error ? <MdiTopologyRegion id="p4" topology={topology}><div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{error}</div></MdiTopologyRegion> : <MdiTopologyRegion id="p5" topology={topology}><div className="overflow-hidden rounded-xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">User</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Responsibilities</th><th className="px-5 py-3 font-medium">Application access</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-border">{busy ? <tr><td colSpan={6}><GlobalLoader className="min-h-40" fullScreen={false} /></td></tr> : accounts.map(account => <tr key={account.id}><td className="px-5 py-4"><p className="font-medium">{account.login}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{account.id}</p></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-4 text-muted-foreground" />{roleLabel(account.role)}</span></td><td className="max-w-xs px-5 py-4 text-muted-foreground">{account.responsibilities.join(", ") || "—"}</td><td className="max-w-xs px-5 py-4 text-muted-foreground">{account.applicationIds.join(", ") || "—"}</td><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs ${account.status === "active" ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{account.status}</span></td><td className="px-5 py-4 text-right"><Button aria-label={`Edit ${account.login}`} className="cursor-pointer" onClick={() => setEditing(account)} size="icon" title="Edit user" variant="ghost"><Pencil size={16} /></Button></td></tr>)}</tbody></table></div></div></MdiTopologyRegion>}
    </section>
    <AccountDialog account={editing} onOpenChange={open => { if (!open) setEditing(undefined); }} onSave={save} />
  </MdiTopologyRegion>;
}

function AccountDialog({ account, onOpenChange, onSave }: { account: Account | null | undefined; onOpenChange(open: boolean): void; onSave(value: AccountDraft): Promise<void> }) {
  const [draft, setDraft] = useState<AccountDraft>(emptyDraft); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (account === undefined) return; setError(""); setDraft(account ? { ...account, password: "" } : emptyDraft); }, [account]);
  function toggle<T extends string>(values: T[], value: T) { return values.includes(value) ? values.filter(item => item !== value) : [...values, value]; }
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(draft.login.trim())) throw new Error("Enter a complete email address, for example arunesh@example.com."); await onSave({ ...draft, responsibilities: draft.responsibilities.filter(Boolean) }); } catch (cause) { setError(cause instanceof Error ? cause.message : "User could not be saved."); } finally { setSaving(false); } }
  return <Dialog open={account !== undefined} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{account ? "Edit user" : "Add user"}</DialogTitle><DialogDescription>Assign a role, explicit permissions, application access, and responsibilities.</DialogDescription></DialogHeader><form className="grid gap-5" onSubmit={submit}><label className="grid gap-2 text-sm">Email<input required className="rounded-lg border border-input bg-background p-3" onChange={event => setDraft(value => ({ ...value, login: event.target.value }))} type="email" value={draft.login} /></label><label className="grid gap-2 text-sm">{account ? "New password (optional)" : "Temporary password"}<input {...(account ? {} : { required: true })} className="rounded-lg border border-input bg-background p-3" minLength={8} onChange={event => setDraft(value => ({ ...value, password: event.target.value }))} type="password" value={draft.password} /></label><fieldset className="grid gap-2"><legend className="text-sm font-medium">Role</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{roles.map(role => <label className={`cursor-pointer rounded-lg border p-3 text-sm ${draft.role === role.key ? "border-foreground bg-accent" : "border-border"}`} key={role.key}><input checked={draft.role === role.key} className="sr-only" name="role" onChange={() => setDraft(value => ({ ...value, role: role.key }))} type="radio" />{role.label}</label>)}</div></fieldset><fieldset className="grid gap-2"><legend className="text-sm font-medium">Application access</legend><div className="flex flex-wrap gap-2">{applications.map(application => <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs" key={application}><input checked={draft.applicationIds.includes(application)} onChange={() => setDraft(value => ({ ...value, applicationIds: toggle(value.applicationIds, application) }))} type="checkbox" />{application}</label>)}</div></fieldset><fieldset className="grid gap-2"><legend className="text-sm font-medium">Additional permissions</legend><div className="flex flex-wrap gap-2">{permissions.map(permission => <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs" key={permission}><input checked={draft.permissions.includes(permission)} onChange={() => setDraft(value => ({ ...value, permissions: toggle(value.permissions, permission) }))} type="checkbox" />{permission}</label>)}</div></fieldset><label className="grid gap-2 text-sm">Responsibilities <span className="text-xs font-normal text-muted-foreground">One responsibility per line</span><textarea className="min-h-24 rounded-lg border border-input bg-background p-3" onChange={event => setDraft(value => ({ ...value, responsibilities: event.target.value.split("\n").map(item => item.trim()).filter(Boolean) }))} value={draft.responsibilities.join("\n")} /></label><label className="flex cursor-pointer items-center gap-2 text-sm"><input checked={draft.status === "active"} onChange={event => setDraft(value => ({ ...value, status: event.target.checked ? "active" : "suspended" }))} type="checkbox" />Active user</label>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<div className="flex justify-end gap-3"><Button className="cursor-pointer" onClick={() => onOpenChange(false)} type="button" variant="outline">Cancel</Button><Button className="cursor-pointer" disabled={saving} type="submit"><KeyRound size={16} />{saving ? "Saving…" : "Save user"}</Button></div></form></DialogContent></Dialog>;
}
function roleLabel(role: Role) { return roles.find(item => item.key === role)?.label ?? role; }
