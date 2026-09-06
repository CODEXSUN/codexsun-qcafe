import { useState } from "react";
import { Check, Copy, KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { setChatConnection } from "./connection-session.js";
import { issueLocalChatAccessToken } from "./local-access-token.js";
import { defaultChatApiUrl, isLocalChatApiUrl } from "./connection-defaults.js";

const defaultApiUrl = defaultChatApiUrl();

export function ChatConnectionSettings() {
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [accessToken, setAccessToken] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generateToken() {
    setBusy(true);
    setError("");
    try {
      const issued = await issueLocalChatAccessToken(apiUrl);
      setAccessToken(issued.accessToken);
      setExpiresAt(issued.expiresAt);
      setChatConnection({ apiUrl: issued.apiUrl, accessToken: issued.accessToken });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Token generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    await navigator.clipboard.writeText(accessToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  const localTokenAvailable = isLocalChatApiUrl(apiUrl);

  return <section className="grid gap-5 rounded-xl border border-border bg-card p-5">
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background"><KeyRound size={18} /></span>
      <div><h2 className="font-medium">Chat connection</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{localTokenAvailable ? "Generate a short-lived token for the local development Chat API." : "Cloud Chat uses the authenticated CODEXSUN OS session. Desktop and mobile receive credentials through cloud enrollment."}</p></div>
    </div>
    <label className="grid gap-2 text-sm"><span className="font-medium">Chat API URL</span><input className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:border-foreground" type="url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} /></label>
    {localTokenAvailable && accessToken && <label className="grid gap-2 text-sm"><span className="font-medium">Generated access token</span><span className="flex gap-2"><input aria-label="Generated access token" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-xs" readOnly type="password" value={accessToken} /><Button aria-label="Copy access token" onClick={() => void copyToken()} type="button" variant="outline">{copied ? <Check size={16} /> : <Copy size={16} />}</Button></span>{expiresAt && <span className="text-xs text-muted-foreground">Expires {new Date(expiresAt).toLocaleString()}</span>}</label>}
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    {localTokenAvailable && <div><Button className="cursor-pointer" disabled={busy} onClick={() => void generateToken()} type="button">{busy ? <><LoaderCircle className="animate-spin" size={16} />Generating…</> : "Generate and connect"}</Button></div>}
  </section>;
}