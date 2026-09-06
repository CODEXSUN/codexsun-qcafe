import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type ProviderId = "c" | "g" | "o";
type Provider = { id: ProviderId; name: string; model: string; configured: boolean; busy: boolean; capabilities: string[]; connectedAs?: string; connectionMethod?: string };
type Connections = { providers: Provider[]; codex: { status: "idle" | "pending" | "connected" | "failed"; url?: string; code?: string; message?: string } };

const providerTabs: Array<{ id: ProviderId; label: string }> = [{ id: "c", label: "Codex" }, { id: "g", label: "Gemini" }, { id: "o", label: "OpenCode" }];

function App() {
  const [data, setData] = useState<Connections>();
  const [activeProvider, setActiveProvider] = useState<ProviderId>("c");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    try { setData(await request<Connections>("/api/v1/zxa/connections")); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ZXA is unavailable."); }
  }
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 3000); return () => clearInterval(timer); }, []);

  async function startCodex() { setBusy(true); try { setData(await request<Connections>("/api/v1/zxa/connections/codex/device", { method: "POST" })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start Codex sign-in."); } finally { setBusy(false); } }
  async function cancelCodex() { setBusy(true); try { setData(await request<Connections>("/api/v1/zxa/connections/codex/device", { method: "DELETE" })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not cancel Codex sign-in."); } finally { setBusy(false); } }
  async function copyDeviceCode() { if (!data?.codex.code) return; try { await navigator.clipboard.writeText(data.codex.code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setError("Copy the displayed device code manually."); } }
  async function saveProvider(event: React.FormEvent) { event.preventDefault(); if (!key.trim() || activeProvider === "c") return; setBusy(true); try { await request(`/api/v1/zxa/connections/${activeProvider}`, { method: "PUT", body: { apiKey: key.trim() } }); setKey(""); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the connection."); } finally { setBusy(false); } }

  const active = data?.providers.find((provider) => provider.id === activeProvider);
  const codex = data?.codex;
  return <main>
    <header className="page-header"><span className="mark" aria-hidden="true">ZXA</span><div><p className="eyebrow">LOCAL AGENT RUNTIME</p><h1>Connections</h1><p>Configure the isolated runtime. Provider credentials stay in the ZXA Docker volume.</p></div></header>
    {error && <p className="alert" role="alert">{error}</p>}
    <div className="workspace">
      <section className="connection-workspace" aria-label="Provider connections">
        <div className="tabs" role="tablist" aria-label="Provider">{providerTabs.map((tab) => <button className={activeProvider === tab.id ? "tab selected" : "tab"} key={tab.id} onClick={() => setActiveProvider(tab.id)} role="tab" aria-selected={activeProvider === tab.id}>{tab.label}<Status connected={data?.providers.find((provider) => provider.id === tab.id)?.configured} compact /></button>)}</div>
        <article className="card provider-card"><div className="card-heading"><div><p className="eyebrow">{active?.name ?? "Provider"}</p><h2>{activeProvider === "c" ? "Sign in with a device code" : `Connect ${active?.name ?? "provider"}`}</h2></div><Status connected={active?.configured} /></div>
          {activeProvider === "c" ? <CodexPanel codex={codex} busy={busy} copied={copied} onStart={() => void startCodex()} onCancel={() => void cancelCodex()} onCopy={() => void copyDeviceCode()} /> : <form className="key-form" onSubmit={saveProvider}><p>Enter an API key for this provider. It is stored only in the local ZXA state volume.</p><label htmlFor="provider-key">{active?.name} API key</label><input id="provider-key" value={key} onChange={(event) => setKey(event.target.value)} type="password" placeholder="Paste API key" autoComplete="off" /><button className="primary" disabled={busy || !key.trim()}>Save local key</button></form>}
        </article>
      </section>
      <aside className="properties" aria-label="Connection properties"><div className="properties-heading"><div><p className="eyebrow">PROPERTIES</p><h2>Runtime status</h2></div><span className="local-indicator">Local</span></div><section className="property-section"><h3>Connection scope</h3><dl><div><dt>Runtime</dt><dd>ZXA Docker container</dd></div><div><dt>Credentials</dt><dd>Local persistent volume</dd></div><div><dt>Refresh</dt><dd>Every 3 seconds</dd></div></dl></section><section className="property-section"><h3>Connected providers</h3>{data?.providers.map((provider) => <div className="connection-row" key={provider.id}><div><strong>{provider.name}</strong><span>{provider.configured ? provider.connectedAs ?? "Connected locally" : "Not connected"}</span><small>{provider.configured ? provider.connectionMethod ?? provider.model : provider.model}</small></div><Status connected={provider.configured} /></div>) ?? <p className="muted">Loading provider status…</p>}</section></aside>
    </div>
  </main>;
}

function CodexPanel({ codex, busy, copied, onStart, onCancel, onCopy }: { codex?: Connections["codex"]; busy: boolean; copied: boolean; onStart: () => void; onCancel: () => void; onCopy: () => void }) {
  if (codex?.status === "pending") return <div className="device-flow"><ol><li>Open the Codex device page.</li><li>Copy and paste the one-time code.</li><li>Return here while ZXA confirms the sign-in.</li></ol><div className="device-code"><span>{codex.code ?? "Preparing code…"}</span><button className="secondary" disabled={!codex.code} onClick={onCopy}>{copied ? "Copied" : "Copy code"}</button></div><a className="device-link" href={codex.url ?? "https://auth.openai.com/codex/device"} target="_blank" rel="noreferrer">Open https://auth.openai.com/codex/device</a><div className="actions"><button className="secondary" disabled={busy} onClick={onCancel}>Cancel</button></div><p className="muted">{codex.message ?? "Waiting for the device authorization to finish."}</p></div>;
  if (codex?.status === "connected") return <div className="result"><Status connected /><p>Codex is connected through its device authorization session.</p></div>;
  return <div className="device-flow"><p>Use the ChatGPT account that should run Codex in this isolated container. ZXA will show a one-time code to paste into the device page.</p><button className="primary" disabled={busy} onClick={onStart}>Get device code</button>{codex?.message && <p className="alert" role="alert">{codex.message}</p>}</div>;
}
function Status({ connected, compact = false }: { connected?: boolean; compact?: boolean }) { return <span className={connected ? "status ok" : "status"}>{compact ? (connected ? "Connected" : "Not connected") : connected ? "Connected" : "Not connected"}</span>; }
async function request<T>(path: string, options: { method?: string; body?: unknown } = {}) { const response = await fetch(path, { method: options.method, headers: options.body ? { "content-type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined }); const value = await response.json() as T & { error?: string }; if (!response.ok || value.error) throw new Error(value.error || "ZXA request failed."); return value; }
createRoot(document.getElementById("root")!).render(<App />);

