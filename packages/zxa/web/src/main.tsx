import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type ProviderId = "c" | "g" | "o";
type Provider = { id: ProviderId; name: string; model: string; configured: boolean; busy: boolean; capabilities: string[]; connectedAs?: string; connectionMethod?: string };
type Connections = {
  providers: Provider[];
  codex: { status: "idle" | "pending" | "connected" | "failed"; url?: string; code?: string; message?: string };
  geminiAuth?: { status: "idle" | "pending" | "connected" | "failed"; url?: string; email?: string; message?: string };
};
type UsageMetric = { requests: number; completed: number; failed: number; lastDurationMs: number | null; lastUsage: { inputTokens: number; outputTokens: number; cachedInputTokens: number } | null; lastError: string | null };
type Usage = { accountQuota: "unavailable"; accountQuotaNote: string; updatedAt: string | null; providers: Record<ProviderId, UsageMetric> };

type ModelOption = {
  id: string;
  name: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
};

type TestResult = {
  ok: boolean;
  message?: string;
  error?: string;
  durationMs?: number;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number; cachedInputTokens: number } | null;
};

const providerTabs: Array<{ id: ProviderId; label: string }> = [
  { id: "c", label: "Codex" },
  { id: "g", label: "Gemini" },
  { id: "o", label: "OpenCode" },
];

const DEFAULT_GEMINI_MODELS: ModelOption[] = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Flagship: State-of-the-art coding & multimodal reasoning (Google Code Assist)" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fastest & versatile multimodal reasoning" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Preview)", description: "Advanced preview reasoning" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", description: "Next-gen ultra fast performance" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "High speed multimodal" },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash-Lite", description: "Cost-optimized" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "2M token context" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Balanced standard" },
];

const DEFAULT_OPENCODE_MODELS: ModelOption[] = [
  { id: "opencode/nemotron-3-ultra-free", name: "Nemotron 3 Ultra (Free)", description: "NVIDIA Nemotron free built-in model" },
  { id: "opencode/nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning (Free)", description: "Ultra-fast Nemotron 3.5 free model" },
  { id: "opencode/mimo-v2.5-free", name: "Mimo v2.5 (Free)", description: "Mimo fast reasoning free model" },
  { id: "opencode/big-pickle", name: "Big Pickle (Free)", description: "Community coding model" },
  { id: "opencode/ling-3.0-flash-fin-free", name: "Ling 3.0 Flash (Free)", description: "Ling flash high-throughput free model" },
  { id: "opencode/muse-spark-1.3-contributor-free", name: "Muse Spark 1.3 (Free)", description: "Muse contributor free model" },
];

function getInitialProvider(): ProviderId {
  const urlParam = new URLSearchParams(window.location.search).get("provider") || window.location.hash.replace("#", "");
  if (urlParam === "c" || urlParam === "codex") return "c";
  if (urlParam === "o" || urlParam === "opencode") return "o";
  return "g";
}

function App() {
  const initialProvider = getInitialProvider();
  const [data, setData] = useState<Connections>();
  const [usage, setUsage] = useState<Usage>();
  const [activeProvider, setActiveProvider] = useState<ProviderId>(initialProvider);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date>();
  const [key, setKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelChoice, setModelChoice] = useState(
    initialProvider === "o" ? "opencode/nemotron-3-ultra-free" : "gemini-2.5-flash"
  );
  const [customModel, setCustomModel] = useState("");
  const [copied, setCopied] = useState(false);
  const [googleAuthCode, setGoogleAuthCode] = useState("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);

  // Models state
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(
    initialProvider === "o" ? DEFAULT_OPENCODE_MODELS : DEFAULT_GEMINI_MODELS
  );
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelsLive, setModelsLive] = useState(false);

  // Test state
  const [testPrompt, setTestPrompt] = useState("Confirm you are connected to ZXA and state your model identifier.");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  async function load() {
    try {
      const [connections, latestUsage] = await Promise.all([
        request<Connections>("/api/v1/zxa/connections"),
        request<Usage>("/api/v1/zxa/usage"),
      ]);
      setData(connections);
      setUsage(latestUsage);
      setRefreshedAt(new Date());
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ZXA is unavailable.");
    }
  }

  async function fetchModels(providerId: ProviderId, apiKeyToUse?: string) {
    setFetchingModels(true);
    try {
      const q = apiKeyToUse ? `?apiKey=${encodeURIComponent(apiKeyToUse)}` : "";
      const res = await request<{ provider: string; live: boolean; models: ModelOption[]; warning?: string }>(
        `/api/v1/zxa/connections/${providerId}/models${q}`
      );
      if (res.models?.length) {
        setAvailableModels(res.models);
        setModelsLive(Boolean(res.live));
      }
    } catch (reason) {
      console.warn("Could not fetch models:", reason);
    } finally {
      setFetchingModels(false);
    }
  }

  useEffect(() => {
    void load();
    void fetchModels(activeProvider);
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeProvider === "o") {
      setModelChoice("opencode/nemotron-3-ultra-free");
      setAvailableModels(DEFAULT_OPENCODE_MODELS);
    } else if (activeProvider === "g") {
      setModelChoice("gemini-2.5-pro");
      setAvailableModels(DEFAULT_GEMINI_MODELS);
    }
    setKey("");
    setBaseUrl("");
    setGoogleAuthCode("");
    setShowApiKeyForm(false);
    setTestResult(null);
    void fetchModels(activeProvider);
  }, [activeProvider]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
      await fetchModels(activeProvider);
    } finally {
      setRefreshing(false);
    }
  }

  async function startCodex() {
    setBusy(true);
    try {
      setData(await request<Connections>("/api/v1/zxa/connections/codex/device", { method: "POST" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start Codex sign-in.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelCodex() {
    setBusy(true);
    try {
      setData(await request<Connections>("/api/v1/zxa/connections/codex/device", { method: "DELETE" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel Codex sign-in.");
    } finally {
      setBusy(false);
    }
  }

  async function copyDeviceCode() {
    if (!data?.codex.code) return;
    try {
      await navigator.clipboard.writeText(data.codex.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy the displayed device code manually.");
    }
  }

  async function startGeminiGoogleAuth() {
    setBusy(true);
    try {
      setData(await request<Connections>("/api/v1/zxa/connections/gemini/google-auth", { method: "POST" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start Google sign-in.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmGeminiGoogleAuth() {
    if (!googleAuthCode.trim()) return;
    setBusy(true);
    try {
      setData(
        await request<Connections>("/api/v1/zxa/connections/gemini/google-auth/confirm", {
          method: "POST",
          body: { code: googleAuthCode.trim() },
        })
      );
      setGoogleAuthCode("");
      await load();
      await fetchModels("g");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google sign-in confirmation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelGeminiGoogleAuth() {
    setBusy(true);
    try {
      setData(await request<Connections>("/api/v1/zxa/connections/gemini/google-auth", { method: "DELETE" }));
      setGoogleAuthCode("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel Google sign-in.");
    } finally {
      setBusy(false);
    }
  }

  const effectiveModel = modelChoice === "custom" ? customModel.trim() : modelChoice;

  async function saveProvider(event: React.FormEvent) {
    event.preventDefault();
    if (activeProvider === "c") return;
    if (!key.trim() && !baseUrl.trim() && activeProvider !== "o") return;
    setBusy(true);
    try {
      const body: { apiKey: string; model?: string; baseUrl?: string } = {
        apiKey: key.trim() || (activeProvider === "o" ? "free" : ""),
      };
      if (baseUrl.trim()) body.baseUrl = baseUrl.trim();
      if (effectiveModel) body.model = effectiveModel;
      await request(`/api/v1/zxa/connections/${activeProvider}`, { method: "PUT", body });
      setKey("");
      setBaseUrl("");
      await load();
      await fetchModels(activeProvider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the connection.");
    } finally {
      setBusy(false);
    }
  }

  async function enableFreeOpenCode() {
    setBusy(true);
    try {
      await request("/api/v1/zxa/connections/o", {
        method: "PUT",
        body: { apiKey: "free", model: effectiveModel || "opencode/nemotron-3-ultra-free" },
      });
      await load();
      await fetchModels("o");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not enable free OpenCode.");
    } finally {
      setBusy(false);
    }
  }

  async function updateModelOnly() {
    if (!effectiveModel) return;
    setBusy(true);
    try {
      await request(`/api/v1/zxa/connections/${activeProvider}`, { method: "PUT", body: { model: effectiveModel } });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update model.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectProvider() {
    setBusy(true);
    try {
      await request(`/api/v1/zxa/connections/${activeProvider}`, { method: "DELETE" });
      setTestResult(null);
      setModelsLive(false);
      await load();
      await fetchModels(activeProvider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not disconnect the provider.");
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    if (!testPrompt.trim()) return;
    setTesting(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      const res = await request<{
        message: string;
        durationMs?: number;
        usage?: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
        connection?: { model?: string };
      }>(`/api/v1/zxa/${activeProvider}/messages`, {
        method: "POST",
        body: { message: testPrompt.trim() },
      });
      setTestResult({
        ok: true,
        message: res.message,
        durationMs: res.durationMs || (Date.now() - startTime),
        model: res.connection?.model,
        usage: res.usage,
      });
      await load();
    } catch (err) {
      setTestResult({
        ok: false,
        error: err instanceof Error ? err.message : "Connection test failed.",
        durationMs: Date.now() - startTime,
      });
    } finally {
      setTesting(false);
    }
  }

  const active = data?.providers.find((provider) => provider.id === activeProvider);
  const codex = data?.codex;

  return (
    <main>
      <header className="page-header">
        <span className="mark" aria-hidden="true">ZXA</span>
        <div>
          <p className="eyebrow">LOCAL AGENT RUNTIME</p>
          <h1>Connections & Model Testing</h1>
          <p>Configure models and test isolated local runtime providers. Provider credentials stay securely in the local ZXA Docker volume.</p>
        </div>
      </header>

      {error && <p className="alert" role="alert">{error}</p>}

      <div className="workspace">
        <section className="connection-workspace" aria-label="Provider connections">
          <div className="tabs" role="tablist" aria-label="Provider">
            {providerTabs.map((tab) => (
              <button
                className={activeProvider === tab.id ? "tab selected" : "tab"}
                key={tab.id}
                onClick={() => {
                  setActiveProvider(tab.id);
                  setTestResult(null);
                }}
                role="tab"
                aria-selected={activeProvider === tab.id}
              >
                {tab.label}
                <Status connected={data?.providers.find((provider) => provider.id === tab.id)?.configured} compact />
              </button>
            ))}
          </div>

          <article className="card provider-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">{active?.name ?? "Provider"}</p>
                <h2>
                  {activeProvider === "c"
                    ? "Sign in with a device code"
                    : active?.configured
                    ? `${active.name} Connection & Model`
                    : `Connect ${active?.name ?? "provider"}`}
                </h2>
              </div>
              <Status connected={active?.configured} />
            </div>

            {activeProvider === "c" ? (
              <CodexPanel
                codex={codex}
                busy={busy}
                copied={copied}
                connected={Boolean(active?.configured)}
                onStart={() => void startCodex()}
                onCancel={() => void cancelCodex()}
                onCopy={() => void copyDeviceCode()}
                onDisconnect={() => void disconnectProvider()}
              />
            ) : (
              <ProviderKeyPanel
                provider={active}
                busy={busy}
                geminiAuth={data?.geminiAuth}
                googleAuthCode={googleAuthCode}
                showApiKeyForm={showApiKeyForm}
                keyValue={key}
                baseUrlValue={baseUrl}
                modelChoice={modelChoice}
                customModel={customModel}
                availableModels={availableModels}
                modelsLive={modelsLive}
                fetchingModels={fetchingModels}
                onGoogleAuthCodeChange={setGoogleAuthCode}
                onShowApiKeyFormChange={setShowApiKeyForm}
                onStartGoogleAuth={() => void startGeminiGoogleAuth()}
                onConfirmGoogleAuth={() => void confirmGeminiGoogleAuth()}
                onCancelGoogleAuth={() => void cancelGeminiGoogleAuth()}
                onKeyChange={setKey}
                onBaseUrlChange={setBaseUrl}
                onModelChoiceChange={setModelChoice}
                onCustomModelChange={setCustomModel}
                onFetchModels={() => void fetchModels(activeProvider, key)}
                onEnableFree={() => void enableFreeOpenCode()}
                onSave={saveProvider}
                onUpdateModel={() => void updateModelOnly()}
                onDisconnect={() => void disconnectProvider()}
              />
            )}
          </article>

          {active?.configured && (
            <section className="test-card" aria-label="Test Connection">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">VERIFY CONNECTION</p>
                  <h3>Test {active.name} Model</h3>
                </div>
                <span className="badge-model">Active Model: {active.model}</span>
              </div>

              <div className="test-flow">
                <label htmlFor="test-prompt">Test Prompt</label>
                <textarea
                  id="test-prompt"
                  className="test-textarea"
                  rows={2}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter a test prompt..."
                />

                <div className="actions">
                  <button className="primary" disabled={testing || !testPrompt.trim()} onClick={() => void runTest()}>
                    {testing ? "Sending to Model..." : `Test ${active.name}`}
                  </button>
                </div>

                {testing && (
                  <div className="test-loading">
                    <span className="spinner" aria-hidden="true" />
                    <span>Executing prompt in isolated ZXA container...</span>
                  </div>
                )}

                {testResult && (
                  <div className={`test-result-box ${testResult.ok ? "success" : "failure"}`}>
                    <div className="test-result-header">
                      <strong>{testResult.ok ? "✅ Model Responded" : "❌ Connection Test Failed"}</strong>
                      <span className="test-meta">
                        {testResult.durationMs ? `${testResult.durationMs}ms` : ""}
                        {testResult.usage && ` · ${testResult.usage.inputTokens} in / ${testResult.usage.outputTokens} out`}
                        {testResult.model && ` · ${testResult.model}`}
                      </span>
                    </div>
                    {testResult.ok ? (
                      <pre className="test-message-content">{testResult.message}</pre>
                    ) : (
                      <p className="test-error-content">{testResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          <UsagePanel
            provider={active}
            usage={usage}
            refreshedAt={refreshedAt}
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        </section>

        <aside className="properties" aria-label="Connection properties">
          <div className="properties-heading">
            <div>
              <p className="eyebrow">PROPERTIES</p>
              <h2>Runtime status</h2>
            </div>
            <span className="local-indicator">Local</span>
          </div>
          <section className="property-section">
            <h3>Connection scope</h3>
            <dl>
              <div><dt>Runtime</dt><dd>ZXA Docker container</dd></div>
              <div><dt>Credentials</dt><dd>Local persistent volume</dd></div>
              <div><dt>CLI Tool</dt><dd><code>npm run zxa:cli</code></dd></div>
              <div><dt>Web Browser</dt><dd><a href="http://127.0.0.1:4230/" target="_blank" rel="noreferrer">127.0.0.1:4230</a></dd></div>
              <div><dt>Refresh</dt><dd>Every 3 seconds</dd></div>
            </dl>
          </section>
          <section className="property-section">
            <h3>Connected providers</h3>
            {data?.providers.map((provider) => (
              <div className="connection-row" key={provider.id}>
                <div>
                  <strong>{provider.name}</strong>
                  <span>{provider.configured ? provider.connectedAs ?? "Connected locally" : "Not connected"}</span>
                  <small>{provider.configured ? `${provider.connectionMethod ?? "Volume"} · ${provider.model}` : provider.model}</small>
                </div>
                <Status connected={provider.configured} />
              </div>
            )) ?? <p className="muted">Loading provider status…</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}

function CodexPanel({
  codex,
  busy,
  copied,
  connected,
  onStart,
  onCancel,
  onCopy,
  onDisconnect,
}: {
  codex?: Connections["codex"];
  busy: boolean;
  copied: boolean;
  connected: boolean;
  onStart: () => void;
  onCancel: () => void;
  onCopy: () => void;
  onDisconnect: () => void;
}) {
  if (codex?.status === "pending") {
    return (
      <div className="device-flow">
        <ol>
          <li>Open the Codex device page.</li>
          <li>Copy and paste the one-time code.</li>
          <li>Return here while ZXA confirms the sign-in.</li>
        </ol>
        <div className="device-code">
          <span>{codex.code ?? "Preparing code…"}</span>
          <button className="secondary" disabled={!codex.code} onClick={onCopy}>
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
        <a className="device-link" href={codex.url ?? "https://auth.openai.com/codex/device"} target="_blank" rel="noreferrer">
          Open https://auth.openai.com/codex/device
        </a>
        <div className="actions">
          <button className="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
        <p className="muted">{codex.message ?? "Waiting for the device authorization to finish."}</p>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="result">
        <Status connected />
        <p>Codex is connected through its device authorization session.</p>
        <div className="actions">
          <button className="secondary danger" disabled={busy} onClick={onDisconnect}>
            Disconnect Codex
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="device-flow">
      <p>Use the ChatGPT account that should run Codex in this isolated container. ZXA will show a one-time code to paste into the device page.</p>
      <button className="primary" disabled={busy} onClick={onStart}>
        Get device code
      </button>
      {codex?.message && <p className="alert" role="alert">{codex.message}</p>}
    </div>
  );
}

function ProviderKeyPanel({
  provider,
  busy,
  geminiAuth,
  googleAuthCode,
  showApiKeyForm,
  keyValue,
  baseUrlValue,
  modelChoice,
  customModel,
  availableModels,
  modelsLive,
  fetchingModels,
  onGoogleAuthCodeChange,
  onShowApiKeyFormChange,
  onStartGoogleAuth,
  onConfirmGoogleAuth,
  onCancelGoogleAuth,
  onKeyChange,
  onBaseUrlChange,
  onModelChoiceChange,
  onCustomModelChange,
  onFetchModels,
  onEnableFree,
  onSave,
  onUpdateModel,
  onDisconnect,
}: {
  provider?: Provider;
  busy: boolean;
  geminiAuth?: Connections["geminiAuth"];
  googleAuthCode: string;
  showApiKeyForm: boolean;
  keyValue: string;
  baseUrlValue: string;
  modelChoice: string;
  customModel: string;
  availableModels: ModelOption[];
  modelsLive: boolean;
  fetchingModels: boolean;
  onGoogleAuthCodeChange: (value: string) => void;
  onShowApiKeyFormChange: (value: boolean) => void;
  onStartGoogleAuth: () => void;
  onConfirmGoogleAuth: () => void;
  onCancelGoogleAuth: () => void;
  onKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onModelChoiceChange: (value: string) => void;
  onCustomModelChange: (value: string) => void;
  onFetchModels: () => void;
  onEnableFree?: () => void;
  onSave: (event: React.FormEvent) => void;
  onUpdateModel: () => void;
  onDisconnect: () => void;
}) {
  const isGemini = provider?.id === "g";
  const isOpenCode = provider?.id === "o";

  return (
    <div>
      {/* Google Account OAuth Sign-In for Gemini (Like Antigravity) */}
      {isGemini && !provider?.configured && (
        <>
          {geminiAuth?.status === "pending" ? (
            <div className="google-auth-box">
              <div className="hint-header">
                <strong>🔑 Sign in with Google (Like Antigravity)</strong>
                <span className="live-status-pill live-status-pill-blue">Google Cloud Code Assist</span>
              </div>
              <p className="hint-text">
                Sign in with your Google email account directly without needing a Google AI Studio API key.
              </p>
              <ol className="google-auth-steps">
                <li>
                  <a
                    href={geminiAuth.url}
                    target="_blank"
                    rel="noreferrer"
                    className="google-sign-in-link"
                  >
                    <span>1. Open Google Sign-in in your browser</span>
                    <span className="arrow-icon">↗</span>
                  </a>
                </li>
                <li>Sign in with your Google email account and approve access.</li>
                <li>Google will display your authorization code on the screen. Copy and paste it below:</li>
              </ol>
              <div className="google-code-input-row">
                <input
                  type="text"
                  placeholder="Paste authorization code here"
                  value={googleAuthCode}
                  onChange={(e) => onGoogleAuthCodeChange(e.target.value)}
                  disabled={busy}
                  className="google-code-input"
                />
                <button
                  type="button"
                  className="primary"
                  disabled={busy || !googleAuthCode.trim()}
                  onClick={onConfirmGoogleAuth}
                >
                  {busy ? "Confirming…" : "Confirm Sign-in"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={onCancelGoogleAuth}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="google-auth-start-box">
              <div className="hint-header">
                <strong>✨ Connect with Google Account (Recommended)</strong>
                <span className="live-status-pill live-status-pill-blue">Direct Email Sign-in</span>
              </div>
              <p className="hint-text">
                Sign in directly with your Google email account to access Gemini flagship models (gemini-2.5-pro, gemini-2.5-flash, gemini-3.1-pro) like Antigravity / Google Code Assist — no Google AI Studio API key required.
              </p>
              <div className="actions" style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="primary google-signin-btn"
                  disabled={busy}
                  onClick={onStartGoogleAuth}
                >
                  <span className="google-icon" aria-hidden="true">G</span>
                  <span>Sign in with Google Account</span>
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onShowApiKeyFormChange(!showApiKeyForm)}
                >
                  {showApiKeyForm ? "Hide API Key Option" : "Or use Google AI Studio API Key"}
                </button>
              </div>
            </div>
          )}

          {/* Optional Google AI Studio Browser Quick Connect Guide when toggled */}
          {showApiKeyForm && (
            <div className="browser-connect-hint">
              <div className="hint-header">
                <strong>🌐 Google AI Studio API Key</strong>
                <span className="live-status-pill">{modelsLive ? "🟢 Live Google Models" : "Catalog Models"}</span>
              </div>
              <p className="hint-text">
                Generate or copy your free Gemini API key in Google AI Studio, select a model, and connect:
              </p>
              <div className="hint-actions">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="browser-open-btn"
                >
                  <span>Get Gemini API Key in Google AI Studio</span>
                  <span className="arrow-icon">↗</span>
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* Free Built-in LLMs quick connect for OpenCode */}
      {isOpenCode && !provider?.configured && (
        <div className="browser-connect-hint opencode-free-box">
          <div className="hint-header">
            <strong>⚡ Free Built-in LLM (No API Key Required)</strong>
            <span className="live-status-pill">{modelsLive ? "🟢 Free OpenCode Models" : "Free Models Included"}</span>
          </div>
          <p className="hint-text">
            OpenCode CLI inside ZXA includes free built-in inference powered by NVIDIA Nemotron, Mimo, Big Pickle, and Ling Flash models. No account or API key needed!
          </p>
          <div className="model-section-header">
            <label htmlFor="opencode-free-model">Select Free Model</label>
            <button
              type="button"
              className="secondary small-btn"
              disabled={fetchingModels || busy}
              onClick={onFetchModels}
            >
              {fetchingModels ? "Fetching…" : "Detect Models"}
            </button>
          </div>
          <select
            id="opencode-free-model"
            value={modelChoice}
            onChange={(e) => onModelChoiceChange(e.target.value)}
            className="model-select"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.id} {m.description ? `— ${m.description}` : ""}
              </option>
            ))}
          </select>
          <div className="actions" style={{ marginTop: "14px" }}>
            <button
              type="button"
              className="primary btn-free"
              disabled={busy}
              onClick={onEnableFree}
            >
              {busy ? "Enabling…" : "⚡ Connect Free Built-in LLM"}
            </button>
          </div>
        </div>
      )}

      {provider?.configured ? (
        <div className="result">
          <Status connected />
          <p>
            {provider.name} is connected ({provider.connectionMethod || "locally"})
            {provider.connectedAs ? ` as ${provider.connectedAs}` : ""} with active model <strong>{provider.model}</strong>.
          </p>

          <div className="model-change-section">
            <div className="model-section-header">
              <label htmlFor="model-switch-select">Select or Change Model:</label>
              <button
                type="button"
                className="secondary small-btn"
                disabled={fetchingModels || busy}
                onClick={onFetchModels}
              >
                {fetchingModels ? "Fetching…" : isGemini ? "Fetch Latest Models" : "Fetch Latest Models"}
              </button>
            </div>

            <div className="model-switch-row">
              {isGemini || isOpenCode ? (
                <select
                  id="model-switch-select"
                  value={modelChoice}
                  onChange={(e) => onModelChoiceChange(e.target.value)}
                  className="model-select"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id} {m.description ? `— ${m.description}` : ""}
                    </option>
                  ))}
                  <option value="custom">Custom model identifier…</option>
                </select>
              ) : (
                <input
                  id="model-switch-select"
                  type="text"
                  placeholder="Model name (e.g. gpt-4o)"
                  value={customModel}
                  onChange={(e) => onCustomModelChange(e.target.value)}
                />
              )}

              {(isGemini || isOpenCode) && modelChoice === "custom" && (
                <input
                  type="text"
                  placeholder={isGemini ? "Custom model id (e.g. gemini-2.5-pro)" : "Custom model id (e.g. anthropic/claude-3-7-sonnet)"}
                  value={customModel}
                  onChange={(e) => onCustomModelChange(e.target.value)}
                />
              )}

              <button className="secondary" disabled={busy} onClick={onUpdateModel}>
                Update Model
              </button>
            </div>
          </div>

          <div className="actions" style={{ marginTop: "20px" }}>
            <button className="secondary danger" disabled={busy} onClick={onDisconnect}>
              Disconnect {provider.name}
            </button>
          </div>
        </div>
      ) : (
        (!isGemini || showApiKeyForm) && (
          <form className="key-form" onSubmit={onSave}>
            <p>
              {isOpenCode
                ? "Or connect OpenCode using an API key (Anthropic, OpenAI, OpenRouter, DeepSeek) or local Ollama URL. Stored only in the local ZXA volume."
                : `Enter an API key for ${provider?.name ?? "this provider"}. Stored only in the local ZXA container volume.`}
            </p>

            <label htmlFor="provider-key">{provider?.name} API key</label>
            <input
              id="provider-key"
              value={keyValue}
              onChange={(event) => onKeyChange(event.target.value)}
              type="password"
              placeholder={`Paste ${provider?.name ?? ""} API key`}
              autoComplete="off"
            />

            {isOpenCode && (
              <>
                <label htmlFor="provider-base-url">Custom Base URL (optional, e.g. for local Ollama / vLLM)</label>
                <input
                  id="provider-base-url"
                  value={baseUrlValue}
                  onChange={(event) => onBaseUrlChange(event.target.value)}
                  type="text"
                  placeholder="http://host.docker.internal:11434/v1"
                />
              </>
            )}

            {isGemini && (
              <>
                <div className="model-section-header">
                  <label htmlFor="provider-model-select">Select Gemini Model</label>
                  <button
                    type="button"
                    className="secondary small-btn"
                    disabled={fetchingModels || !keyValue.trim()}
                    onClick={onFetchModels}
                    title={keyValue.trim() ? "Query Google API for latest models" : "Paste API key first"}
                  >
                    {fetchingModels ? "Fetching…" : "Fetch Latest from Google"}
                  </button>
                </div>

                <select
                  id="provider-model-select"
                  value={modelChoice}
                  onChange={(e) => onModelChoiceChange(e.target.value)}
                  className="model-select"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id} {m.description ? `— ${m.description}` : ""}
                    </option>
                  ))}
                  <option value="custom">Custom model identifier…</option>
                </select>

                {modelChoice === "custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom Gemini model (e.g. gemini-2.5-pro)"
                    value={customModel}
                    onChange={(e) => onCustomModelChange(e.target.value)}
                  />
                )}
              </>
            )}

            {isOpenCode && (
              <>
                <div className="model-section-header">
                  <label htmlFor="provider-opencode-select">Select Model</label>
                  <button
                    type="button"
                    className="secondary small-btn"
                    disabled={fetchingModels}
                    onClick={onFetchModels}
                  >
                    {fetchingModels ? "Fetching…" : "Detect Models"}
                  </button>
                </div>

                <select
                  id="provider-opencode-select"
                  value={modelChoice}
                  onChange={(e) => onModelChoiceChange(e.target.value)}
                  className="model-select"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id} {m.description ? `— ${m.description}` : ""}
                    </option>
                  ))}
                  <option value="custom">Custom model identifier…</option>
                </select>

                {modelChoice === "custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom model (e.g. anthropic/claude-3-7-sonnet)"
                    value={customModel}
                    onChange={(e) => onCustomModelChange(e.target.value)}
                  />
                )}
              </>
            )}

            <button className="primary" disabled={busy || (!keyValue.trim() && !baseUrlValue.trim())}>
              Save & Connect {provider?.name ?? "Provider"}
            </button>
          </form>
        )
      )}
    </div>
  );
}

function UsagePanel({
  provider,
  usage,
  refreshedAt,
  refreshing,
  onRefresh,
}: {
  provider?: Provider;
  usage?: Usage;
  refreshedAt?: Date;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const metric = provider && usage ? usage.providers[provider.id] : undefined;
  return (
    <section className="usage-panel" aria-live="polite">
      <div className="usage-heading">
        <div>
          <p className="eyebrow">LOCAL RUNTIME METRICS</p>
          <h2>{provider?.name ?? "Provider"} usage</h2>
        </div>
        <button className="secondary" disabled={refreshing} onClick={onRefresh}>
          {refreshing ? "Refreshing…" : "Refresh now"}
        </button>
      </div>
      {!metric ? (
        <p className="muted">Loading runtime metrics…</p>
      ) : (
        <>
          <div className="usage-grid">
            <UsageItem label="Requests" value={String(metric.requests)} />
            <UsageItem label="Completed" value={String(metric.completed)} />
            <UsageItem label="Failed" value={String(metric.failed)} />
            <UsageItem label="Last duration" value={metric.lastDurationMs ? `${metric.lastDurationMs} ms` : "No request yet"} />
            <UsageItem label="Tokens last request" value={metric.lastUsage ? String(metric.lastUsage.inputTokens + metric.lastUsage.outputTokens) : "No token data yet"} />
            <UsageItem label="Available account tokens" value="Not provided by device authorization" />
          </div>
          <p className="usage-note">{usage?.accountQuotaNote}</p>
          {metric.lastError && <p className="usage-error">Latest result: {metric.lastError}</p>}
          <p className="usage-refresh">
            {refreshedAt ? `Updated ${refreshedAt.toLocaleTimeString()} · automatic refresh every 3 seconds` : "Waiting for the first refresh…"}
          </p>
        </>
      )}
    </section>
  );
}

function UsageItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Status({ connected, compact = false }: { connected?: boolean; compact?: boolean }) {
  return (
    <span className={connected ? "status ok" : "status"}>
      {compact ? (connected ? "Connected" : "Not connected") : (connected ? "Connected" : "Not connected")}
    </span>
  );
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await fetch(path, {
    method: options.method,
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const value = (await response.json()) as T & { error?: string };
  if (!response.ok || value.error) throw new Error(value.error || "ZXA request failed.");
  return value;
}

createRoot(document.getElementById("root")!).render(<App />);
