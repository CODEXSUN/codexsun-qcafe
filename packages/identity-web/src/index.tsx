import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@codexsun/ui/components/button";
import { clearPlatformSession, configurePlatformSession } from "@codexsun/platform-host-contracts";
import { refreshSession } from "./refresh-session.js";

export type IdentitySessionStore = { load(): Promise<string | null>; save(refreshToken: string): Promise<void>; clear?(): Promise<void> };
export type IdentityProfile = { id: string; login: string; permissions: string[]; scope: "single-client" | "tenant" };

type IdentitySession = { profile?: IdentityProfile; signedIn: boolean; signOut(): Promise<void> };

const IdentitySessionContext = createContext<IdentitySession>({ signedIn: false, signOut: async () => undefined });

export function useIdentitySession(): IdentitySession {
  return useContext(IdentitySessionContext);
}

export function IdentityGate({ children, onAuthenticated, onSignedOut, baseUrl = window.location.origin, sessionStore }: { children: ReactNode; onAuthenticated: (token: string) => void; onSignedOut?: () => void; baseUrl?: string; sessionStore?: IdentitySessionStore }) {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<IdentityProfile>();
  const [accessToken, setAccessToken] = useState("");
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [setupExpiresAt, setSetupExpiresAt] = useState("");
  const [setupMode, setSetupMode] = useState(false);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function loadSetupStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/v1/identity/setup`, { cache: "no-store", credentials: "include" });
      if (!response.ok) return false;
      const result = await response.json() as { available?: boolean; expiresAt?: string };
      setSetupAvailable(result.available === true);
      setSetupExpiresAt(result.expiresAt ?? "");
      return result.available === true;
    } catch { return false; }
  }

  async function loadProfile(token: string): Promise<IdentityProfile | undefined> {
    const response = await fetch(`${baseUrl}/api/v1/identity/me`, { credentials: "include", headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return undefined;
    const result = await response.json() as { profile?: IdentityProfile };
    return result.profile;
  }

  async function completeAuthentication(result: { accessToken: string; refreshToken: string }, fallbackLogin?: string): Promise<void> {
    configurePlatformSession({ baseUrl, accessToken: result.accessToken });
    await sessionStore?.save(result.refreshToken);
    setAccessToken(result.accessToken);
    setProfile(await loadProfile(result.accessToken) ?? (fallbackLogin ? { id: "", login: fallbackLogin, permissions: [], scope: "single-client" } : undefined));
    onAuthenticated(result.accessToken);
    setReady(true);
  }

  async function refresh(): Promise<void> {
    const token = await sessionStore?.load();
    const result = await refreshSession(baseUrl, token);
    if (!result) {
      clearPlatformSession();
      setAccessToken("");
      setProfile(undefined);
      setReady(false);
      return;
    }
    await completeAuthentication(result);
  }

  async function signOut(): Promise<void> {
    setBusy(true);
    try {
      if (accessToken) await fetch(`${baseUrl}/api/v1/identity/logout`, { credentials: "include", headers: { authorization: `Bearer ${accessToken}` }, method: "POST" });
    } finally {
      clearPlatformSession();
      await sessionStore?.clear?.();
      setAccessToken("");
      setProfile(undefined);
      setReady(false);
      setPassword("");
      onSignedOut?.();
      setBusy(false);
    }
  }

  useEffect(() => {
    let disposed = false;
    void loadSetupStatus().catch(() => { if (!disposed) setSetupAvailable(false); });
    void refresh().catch(() => { if (!disposed) setError("Unable to reach CODEXSUN OS."); }).finally(() => { if (!disposed) setChecking(false); });
    const interval = setInterval(() => { void refresh().catch(() => setError("Connection lost. Reconnecting…")); }, 10 * 60 * 1000);
    return () => { disposed = true; clearInterval(interval); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (setupMode && password !== confirmation) throw new Error("Passwords do not match.");
      const response = await fetch(`${baseUrl}/api/v1/identity/${setupMode ? "setup" : "login"}`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ login, password, ...(setupMode ? { code } : {}) }) });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Too many attempts. Try again shortly.");
        if (setupMode && !await loadSetupStatus()) throw new Error("Setup code expired or setup is already complete. Generate and synchronize a new code, then try again.");
        throw new Error(setupMode ? "Setup code does not match this CODEXSUN OS installation." : "Sign-in failed. Check your email and password.");
      }
      const result = await response.json() as { accessToken: string; refreshToken: string };
      await completeAuthentication(result, login.trim().toLowerCase());
      setPassword("");
      setCode("");
      setConfirmation("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection failed."); }
    finally { setBusy(false); }
  }

  if (checking) return <main className="grid min-h-screen place-items-center bg-background text-foreground">Connecting to CODEXSUN OS…</main>;
  if (ready) return <IdentitySessionContext.Provider value={{ profile, signedIn: true, signOut }}>{children}</IdentitySessionContext.Provider>;
  return <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground"><form className="flex w-full max-w-sm flex-col gap-6" onSubmit={submit}>
    <div><p className="text-sm text-muted-foreground">CODEXSUN OS</p><h1 className="mt-2 text-2xl font-semibold">{setupMode ? "Set your first password" : "Sign in to your workspace"}</h1></div>
    <label className="grid gap-2 text-sm">Email<input autoComplete="username" type="email" required value={login} onChange={event => setLogin(event.target.value)} className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /></label>
    {setupMode && <label className="grid gap-2 text-sm">One-time setup code<input autoComplete="off" type="password" required value={code} onChange={event => setCode(event.target.value)} className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /><span className="text-xs text-muted-foreground">Use the setup code from the private operator environment.{setupExpiresAt && ` Expires ${new Date(setupExpiresAt).toLocaleString()}.`}</span></label>}
    <label className="grid gap-2 text-sm">{setupMode ? "New password (at least 8 characters)" : "Password"}<input autoComplete={setupMode ? "new-password" : "current-password"} minLength={setupMode ? 8 : undefined} type="password" required value={password} onChange={event => setPassword(event.target.value)} className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /></label>
    {setupMode && <label className="grid gap-2 text-sm">Confirm password<input autoComplete="new-password" type="password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /></label>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button className="cursor-pointer" disabled={busy} type="submit">{busy ? "Please wait…" : setupMode ? "Set password and sign in" : "Sign in"}</Button>
    {setupAvailable && <Button variant="ghost" className="cursor-pointer" disabled={busy} type="button" onClick={() => { setSetupMode(!setupMode); setError(""); setPassword(""); setCode(""); setConfirmation(""); }}>{setupMode ? "Back to sign in" : "First-time password setup"}</Button>}
  </form></main>;
}