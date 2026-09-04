import { useState } from "react";
import { Check, Copy, KeyRound, LoaderCircle } from "lucide-react";
import { CHAT_LOCAL_ACCESS_TOKEN_PATH, type ChatApiSuccess, type ChatLocalAccessToken } from "@codexsun/chat-contracts";
import { Button } from "@codexsun/ui/components/button";
import { setChatConnection } from "./connection-session.js";

const defaultApiUrl = import.meta.env.VITE_CHAT_API_URL || "http://127.0.0.1:4165";

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
      const endpoint = new URL(apiUrl);
      if (endpoint.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(endpoint.hostname)) {
        throw new Error("Token generation is available only for a local Chat API.");
      }
      const response = await fetch(`${endpoint.origin}${CHAT_LOCAL_ACCESS_TOKEN_PATH}`, { method: "POST" });
      const envelope = await response.json() as ChatApiSuccess<ChatLocalAccessToken> | { success: false; error?: { message?: string } };
      if (!response.ok || !envelope.success) throw new Error(!envelope.success ? envelope.error?.message ?? "Token generation failed." : "Token generation failed.");
      setAccessToken(envelope.data.accessToken);
      setExpiresAt(envelope.data.expiresAt);
      setChatConnection({ apiUrl: endpoint.origin, accessToken: envelope.data.accessToken });
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

  return <section className="grid gap-5 rounded-xl border border-border bg-card p-5">
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background"><KeyRound size={18} /></span>
      <div><h2 className="font-medium">Local Chat access</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Generate a short-lived token for the Chat API on this device. It remains in application memory and is sent to Chat automatically.</p></div>
    </div>
    <label className="grid gap-2 text-sm"><span className="font-medium">Chat API URL</span><input className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:border-foreground" type="url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} /></label>
    {accessToken && <label className="grid gap-2 text-sm"><span className="font-medium">Generated access token</span><span className="flex gap-2"><input aria-label="Generated access token" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-xs" readOnly type="password" value={accessToken} /><Button aria-label="Copy access token" onClick={() => void copyToken()} type="button" variant="outline">{copied ? <Check size={16} /> : <Copy size={16} />}</Button></span>{expiresAt && <span className="text-xs text-muted-foreground">Expires {new Date(expiresAt).toLocaleString()}</span>}</label>}
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    <div><Button disabled={busy} onClick={() => void generateToken()} type="button">{busy ? <><LoaderCircle className="animate-spin" size={16} />Generating…</> : "Generate and connect"}</Button></div>
  </section>;
}
