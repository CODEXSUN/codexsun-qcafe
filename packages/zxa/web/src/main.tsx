import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type ProviderId = "c" | "g" | "o";
type Provider = { id: ProviderId; name: string; model: string; configured: boolean; busy: boolean; capabilities: string[]; connectedAs?: string; connectionMethod?: string };
type Connections = { providers: Provider[]; codex: { status: "idle" | "pending" | "connected" | "failed"; url?: string; code?: string; message?: string } };
type UsageMetric = { requests: number; completed: number; failed: number; lastDurationMs: number | null; lastUsage: { inputTokens: number; outputTokens: number; cachedInputTokens: number } | null; lastError: string | null };
type Usage = { accountQuota: "unavailable"; accountQuotaNote: string; updatedAt: string | null; providers: Record<ProviderId, UsageMetric> };

const providerTabs: Array<{ id: ProviderId; label: string }> = [{ id: "c", label: "Codex" }, { id: "g", label: "Gemini" }, { id: "o", label: "OpenCode" }];

function App() {
  const [data, setData] = useState<Connections>();
  const [usage, setUsage] = useState<Usage>();
  const [activeProvider, setActiveProvider] = useState<ProviderId>("c");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date>();
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const [connections, latestUsage] = await Promise.all([request<Connections>("/api/v1/zxa/connections"), request<Usage>("/api/v1/zxa/usage")]);
      setData(connections);
      setUsage(latestUsage);
      setRefreshedAt(new Date());
      setError("");
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ZXA is unavailable."); }
  }
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 3000); return () => clearInterval(timer); }, []);

  async function refresh() { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }

  async function startCodex() { setBusy(true); try { setData(await request<Connections>("/api/v1/zxa/connections/codex/device", { method: "POST" })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start Codex sign-in."); } finally { setBusy(false); } }
  async function cancelCodex() { setBusy(true); try { setData(await request<Connections>("/api/v1/zxa/connections/codex/device", { method: "DELETE" })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not cancel Codex sign-in."); } finally { setBusy(false); } }
  async function copyDeviceCode() { if (!data?.codex.code) return; try { await navigator.clipboard.writeText(data.codex.code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setError("Copy the displayed device code manually."); } }
  async function saveProvider(event: React.FormEvent) { event.preventDefault(); if (!key.trim() || activeProvider === "c") return; setBusy(true); try { await request(`/api/v1/zxa/connections/${activeProvider}`, { method: "PUT", body: { apiKey: key.trim() } }); setKey(""); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the connection."); } finally { setBusy(false); } }
  async function disconnectProvider() { setBusy(true); try { await request(`/api/v1/zxa/connections/${activeProvider}`, { method: "DELETE" }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not disconnect the provider."); } finally { setBusy(false); } }

  const active = data?.providers.find((provider) => provider.id === activeProvider);
  const codex = data?.codex;
  return <main>
    <header className="page-header"><span className="mark" aria-hidden="true">ZXA</span><div><p className="eyebrow">LOCAL AGENT RUNTIME</p><h1>Connections</h1><p>Configure the isolated runtime. Provider credentials stay in the ZXA Docker volume.</p></div></header>
    {error && <p className="alert" role="alert">{error}</p>}
    <div className="workspace">
      <section className="connection-workspace" aria-label="Provider connections">
        <div className="tabs" role="tablist" aria-label="Provider">{providerTabs.map((tab) => <button className={activeProvider === tab.id ? "tab selected" : "tab"} key={tab.id} onClick={() => setActiveProvider(tab.id)} role="tab" aria-selected={activeProvider === tab.id}>{tab.label}<Status connected={data?.providers.find((provider) => provider.id === tab.id)?.configured} compact /></button>)}</div>
        <article className="card provider-card"><div className="card-heading"><div><p className="eyebrow">{active?.name ?? "Provider"}</p><h2>{activeProvider === "c" ? "Sign in with a device code" : `Connect ${active?.name ?? "provider"}`}</h2></div><Status connected={active?.configured} /></div>
          {activeProvider === "c" ? <CodexPanel codex={codex} busy={busy} copied={copied} connected={Boolean(active?.configured)} onStart={() => void startCodex()} onCancel={() => void cancelCodex()} onCopy={() => void copyDeviceCode()} onDisconnect={() => void disconnectProvider()} /> : <ProviderKeyPanel provider={active} busy={busy} keyValue={key} onKeyChange={setKey} onSave={saveProvider} onDisconnect={() => void disconnectProvider()} />}
        </article>
        <UsagePanel provider={active} usage={usage} refreshedAt={refreshedAt} refreshing={refreshing} onRefresh={() => void refresh()} />
      </section>
      <aside className="properties" aria-label="Connection properties"><div className="properties-heading"><div><p className="eyebrow">PROPERTIES</p><h2>Runtime status</h2></div><span className="local-indicator">Local</span></div><section className="property-section"><h3>Connection scope</h3><dl><div><dt>Runtime</dt><dd>ZXA Docker container</dd></div><div><dt>Credentials</dt><dd>Local persistent volume</dd></div><div><dt>Refresh</dt><dd>Every 3 seconds</dd></div></dl></section><section className="property-section"><h3>Connected providers</h3>{data?.providers.map((provider) => <div className="connection-row" key={provider.id}><div><strong>{provider.name}</strong><span>{provider.configured ? provider.connectedAs ?? "Connected locally" : "Not connected"}</span><small>{provider.configured ? provider.connectionMethod ?? provider.model : provider.model}</small></div><Status connected={provider.configured} /></div>) ?? <p className="muted">Loading provider status…</p>}</section></aside>
    </div>
  </main>;
}

function CodexPanel({ codex, busy, copied, connected, onStart, onCancel, onCopy, onDisconnect }: { codex?: Connections["codex"]; busy: boolean; copied: boolean; connected: boolean; onStart: () => void; onCancel: () => void; onCopy: () => void; onDisconnect: () => void }) {
  if (codex?.status === "pending") return <div className="device-flow"><ol><li>Open the Codex device page.</li><li>Copy and paste the one-time code.</li><li>Return here while ZXA confirms the sign-in.</li></ol><div className="device-code"><span>{codex.code ?? "Preparing code…"}</span><button className="secondary" disabled={!codex.code} onClick={onCopy}>{copied ? "Copied" : "Copy code"}</button></div><a className="device-link" href={codex.url ?? "https://auth.openai.com/codex/device"} target="_blank" rel="noreferrer">Open https://auth.openai.com/codex/device</a><div className="actions"><button className="secondary" disabled={busy} onClick={onCancel}>Cancel</button></div><p className="muted">{codex.message ?? "Waiting for the device authorization to finish."}</p></div>;
  if (connected) return <div className="result"><Status connected /><p>Codex is connected through its device authorization session.</p><div className="actions"><button className="secondary danger" disabled={busy} onClick={onDisconnect}>Disconnect Codex</button></div></div>;
  return <div className="device-flow"><p>Use the ChatGPT account that should run Codex in this isolated container. ZXA will show a one-time code to paste into the device page.</p><button className="primary" disabled={busy} onClick={onStart}>Get device code</button>{codex?.message && <p className="alert" role="alert">{codex.message}</p>}</div>;
}

function ProviderKeyPanel({ provider, busy, keyValue, onKeyChange, onSave, onDisconnect }: { provider?: Provider; busy: boolean; keyValue: string; onKeyChange: (value: string) => void; onSave: (event: React.FormEvent) => void; onDisconnect: () => void }) {
  if (provider?.configured) return <div className="result"><Status connected /><p>{provider.name} is connected through local ZXA configuration.</p><div className="actions"><button className="secondary danger" disabled={busy} onClick={onDisconnect}>Disconnect {provider.name}</button></div></div>;
  return <form className="key-form" onSubmit={onSave}><p>Enter an API key for this provider. It is stored only in the local ZXA state volume.</p><label htmlFor="provider-key">{provider?.name} API key</label><input id="provider-key" value={keyValue} onChange={(event) => onKeyChange(event.target.value)} type="password" placeholder="Paste API key" autoComplete="off" /><button className="primary" disabled={busy || !keyValue.trim()}>Save local key</button></form>;
}

function UsagePanel({ provider, usage, refreshedAt, refreshing, onRefresh }: { provider?: Provider; usage?: Usage; refreshedAt?: Date; refreshing: boolean; onRefresh: () => void }) {
  const metric = provider && usage ? usage.providers[provider.id] : undefined;
  return <section className="usage-panel" aria-live="polite"><div className="usage-heading"><div><p className="eyebrow">LOCAL RUNTIME METRICS</p><h2>{provider?.name ?? "Provider"} usage</h2></div><button className="secondary" disabled={refreshing} onClick={onRefresh}>{refreshing ? "Refreshing…" : "Refresh now"}</button></div>{!metric ? <p className="muted">Loading runtime metrics…</p> : <><div className="usage-grid"><UsageItem label="Requests" value={String(metric.requests)} /><UsageItem label="Completed" value={String(metric.completed)} /><UsageItem label="Failed" value={String(metric.failed)} /><UsageItem label="Last duration" value={metric.lastDurationMs ? `${metric.lastDurationMs} ms` : "No request yet"} /><UsageItem label="Tokens last completed request" value={metric.lastUsage ? String(metric.lastUsage.inputTokens + metric.lastUsage.outputTokens) : "No token data yet"} /><UsageItem label="Available account tokens" value="Not provided by device authorization" /></div><p className="usage-note">{usage?.accountQuotaNote}</p>{metric.lastError && <p className="usage-error">Latest result: {metric.lastError}</p>}<p className="usage-refresh">{refreshedAt ? `Updated ${refreshedAt.toLocaleTimeString()} · automatic refresh every 3 seconds` : "Waiting for the first refresh…"}</p></>}</section>;
}

function UsageItem({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Status({ connected, compact = false }: { connected?: boolean; compact?: boolean }) { return <span className={connected ? "status ok" : "status"}>{compact ? (connected ? "Connected" : "Not connected") : connected ? "Connected" : "Not connected"}</span>; }
async function request<T>(path: string, options: { method?: string; body?: unknown } = {}) { const response = await fetch(path, { method: options.method, headers: options.body ? { "content-type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined }); const value = await response.json() as T & { error?: string }; if (!response.ok || value.error) throw new Error(value.error || "ZXA request failed."); return value; }
createRoot(document.getElementById("root")!).render(<App />);

