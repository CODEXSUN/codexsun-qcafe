import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { Button } from "@codexsun/ui/components/button";
import { configurePlatformSession } from "@codexsun/platform-host-contracts";
import { refreshSession } from "./refresh-session.js";

export type IdentitySessionStore = { load(): Promise<string | null>; save(refreshToken: string): Promise<void> };

export function IdentityGate({ children, onAuthenticated, baseUrl = window.location.origin, sessionStore }: { children: ReactNode; onAuthenticated: (token: string) => void; baseUrl?: string; sessionStore?: IdentitySessionStore }) {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function refresh() {
    const token = await sessionStore?.load();
    const result = await refreshSession(baseUrl, token);
    if (!result) { setReady(false); return; }
    configurePlatformSession({ baseUrl, accessToken: result.accessToken });
    await sessionStore?.save(result.refreshToken);
    onAuthenticated(result.accessToken);
    setReady(true);
  }
  useEffect(() => {
    let disposed = false;
    void fetch(`${baseUrl}/api/v1/identity/setup`, { cache: "no-store" }).then(async response => {
      if (response.ok) { const result = await response.json(); if (!disposed) setSetupAvailable(result.available === true); }
    }).catch(() => {});
    void refresh().catch(() => { if (!disposed) setError("Unable to reach CODEXSUN OS."); }).finally(() => { if (!disposed) setChecking(false); });
    const interval = setInterval(() => { void refresh().catch(() => setError("Connection lost. Reconnecting…")); }, 10 * 60 * 1000);
    return () => { disposed = true; clearInterval(interval); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (setupMode && password !== confirmation) throw new Error("Passwords do not match.");
      const response = await fetch(`${baseUrl}/api/v1/identity/${setupMode ? "setup" : "login"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login, password, ...(setupMode ? { code } : {}) }) });
      if (!response.ok) throw new Error(response.status === 429 ? "Too many attempts. Try again shortly." : setupMode ? "Setup failed. Check your email and setup code, or sign in if setup is complete." : "Sign-in failed. Check your email and password.");
      const result = await response.json();
      configurePlatformSession({ baseUrl, accessToken: result.accessToken });
      await sessionStore?.save(result.refreshToken);
      setPassword(""); setCode(""); setConfirmation(""); onAuthenticated(result.accessToken); setReady(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection failed."); }
    finally { setBusy(false); }
  }
  if (checking) return <main className="grid min-h-screen place-items-center bg-background text-foreground">Connecting to CODEXSUN OS…</main>;
  if (ready) return children;
  return <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground"><form className="flex w-full max-w-sm flex-col gap-6" onSubmit={submit}>
    <div><p className="text-sm text-muted-foreground">CODEXSUN OS</p><h1 className="mt-2 text-2xl font-semibold">{setupMode ? "Set your first password" : "Sign in to your workspace"}</h1></div>
    <label className="grid gap-2 text-sm">Email<input autoComplete="username" type="email" required value={login} onChange={event => setLogin(event.target.value)} className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /></label>
    {setupMode && <label className="grid gap-2 text-sm">One-time setup code<input autoComplete="off" type="password" required value={code} onChange={event => setCode(event.target.value)} className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /><span className="text-xs text-muted-foreground">Use OS_SUPER_ADMIN_PASSWORD from the installation .env file.</span></label>}
    <label className="grid gap-2 text-sm">{setupMode ? "New password (at least 16 characters)" : "Password"}<input autoComplete={setupMode ? "new-password" : "current-password"} minLength={setupMode ? 16 : undefined} type="password" required value={password} onChange={event => setPassword(event.target.value)} className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /></label>
    {setupMode && <label className="grid gap-2 text-sm">Confirm password<input autoComplete="new-password" type="password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /></label>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button className="cursor-pointer" disabled={busy} type="submit">{busy ? "Please wait…" : setupMode ? "Set password and sign in" : "Sign in"}</Button>
    {setupAvailable && <Button variant="ghost" className="cursor-pointer" disabled={busy} type="button" onClick={() => { setSetupMode(!setupMode); setError(""); setPassword(""); setCode(""); setConfirmation(""); }}>{setupMode ? "Back to sign in" : "First-time password setup"}</Button>}
  </form></main>;
}
