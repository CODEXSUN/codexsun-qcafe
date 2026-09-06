# ZXA Deployment & Server Installation Runbook

This document records the architectural standards, critical implementation lessons, and verified installation procedures for deploying the **ZXA isolated agent runtime** to any new server, developer environment, or production VPS without failures.

---

## 1. Architectural Principles & Isolation Boundaries

ZXA runs model providers inside a hardened, isolated Docker container (`zxa:v1`) with zero direct host access:

| Layer | Implementation | Purpose |
| :--- | :--- | :--- |
| **Port Binding** | `127.0.0.1:4230 -> 4200` | Loopback only; prevents external network exposure without deliberate proxy. |
| **Filesystem** | `read_only: true` with `tmpfs: /tmp` | Immutable container rootfs; prevents malware or rogue scripts from modifying binaries. |
| **Capabilities** | `cap_drop: ["ALL"]`, `no-new-privileges: true` | Drops all Linux capabilities; prevents privilege escalation. |
| **User** | Non-root (`USER node`, UID 1000) | Least-privilege container execution. |
| **State Persistence** | `zxa-state` volume (`/state`) | Keeps provider credentials (`connections.json`), usage metrics (`usage.json`), and auth files safely separated from code. |
| **Runtime Persistence** | `zxa-runtime` volume (`/runtime`) | Houses installed CLI releases without rebuilding the base container. |
| **Workspace Isolation** | `zxa-workspace` volume (`/workspace`) | Untrusted work directory; never mounts host repository checkouts. |

---

## 2. Core Corrections & Hardened Patterns

During production implementation and testing of the Gemini provider, six specific operational pitfalls were identified and permanently resolved in the architecture:

### 1. Headless Workspace Trust in `@google/gemini-cli`
- **Root Cause**: `@google/gemini-cli` defaults to requiring interactive confirmation before executing in a workspace. In headless Docker subprocesses, this resulted in:
  `"Gemini CLI is not running in a trusted directory. To proceed, either use '--skip-trust', set the 'GEMINI_CLI_TRUST_WORKSPACE=true' environment variable..."`
- **Correction Applied**:
  - `ENV GEMINI_CLI_TRUST_WORKSPACE=true` is baked directly into `packages/zxa/docker/Dockerfile`.
  - Passed in `compose.json` environment definitions.
  - Injected directly into child process `extraEnv` in `runGemini()` in `server.mjs`.

### 2. Embedded JSON Extraction from Mixed CLI Output
- **Root Cause**: `@google/gemini-cli` emits color detection warnings, ripgrep fallback notices, and startup phase metrics to `stdout`/`stderr` *before* outputting JSON. Naive `JSON.parse(stdout)` failed with `SyntaxError`.
- **Correction Applied**:
  - `safeJson` in `server.mjs` extracts JSON between curly brace boundaries (`{` ... `}`), allowing seamless parsing regardless of preceding terminal output:
    ```javascript
    function safeJson(value) {
      if (typeof value !== "string") return null;
      try { return JSON.parse(value); } catch {}
      const firstBrace = value.indexOf("{");
      const lastBrace = value.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { return JSON.parse(value.slice(firstBrace, lastBrace + 1)); } catch {}
      }
      return null;
    }
    ```

### 3. Multi-Level Error Unwrapping
- **Root Cause**: Gemini CLI wraps Google Generative AI errors in doubly-stringified JSON strings (`parsed.error.message` contains an escaped JSON block).
- **Correction Applied**:
  - `server.mjs` unwraps nested JSON error layers recursively, surfacing clean messages (e.g. `API key not valid. Please pass a valid API key.`) instead of generic HTTP 502 or masked text.

### 4. Dynamic Model Discovery & Live API Validation
- **Root Cause**: Static model lists quickly become outdated as Google releases newer models (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`, etc.).
- **Correction Applied**:
  - Added `GET /api/v1/zxa/connections/:provider/models`.
  - Queries `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}` directly.
  - Automatically filters `generateContent` models and ranks the newest flagship models at the top.
  - Serves as a sub-second live key validation check before saving.

### 5. Localhost Browser Exemption
- **Root Cause**: Web UI requests from `localhost` / `127.0.0.1` should not require the user to hunt for bearer tokens in docker logs or `.env`.
- **Correction Applied**:
  - `authenticateOrLocalWeb` verifies if the requester is coming from `localhost` / `127.0.0.1`, allowing seamless browser configuration.

### 6. Read-Only Rootfs Image Lifecycle
- **Root Cause**: Because `read_only: true` is enforced for security, hot-patching files via `docker cp` is rejected by the Docker daemon (`container rootfs is marked read-only`).
- **Correction Applied**:
  - All deployments and updates rebuild the image or stage changes via the `/runtime` persistent volume using `update-zxa.sh apply-cli`.

### 7. OpenCode CLI Integration & Built-in Free Inference
- **Root Cause**: OpenCode CLI (`opencode-ai`) requires persistent home and data directories for authentication (`/state/opencode`), and outputs newline-delimited JSON (NDJSON) event streams where the final generated response text is in `{ "type": "text", "text": "..." }` events and token metrics are in `{ "type": "step_finish", "part": { "tokens": { ... } } }`.
- **Corrections Applied**:
  - **Environment & State**: Subprocess executes with `HOME=/state`, `XDG_CONFIG_HOME=/state/opencode`, `XDG_DATA_HOME=/state/opencode` to persist auth files across container restarts.
  - **Free Built-in Mode**: OpenCode includes free models (`opencode/nemotron-3-ultra-free`, `opencode/mimo-v2.5-free`, `opencode/big-pickle`, `opencode/ling-3.0-flash-fin-free`) that require zero API keys. ZXA natively supports 1-click free activation (`apiKey: "free"`).
  - **Stream Parsing**: Server parses NDJSON line-by-line, aggregates text parts, and extracts input/output/cached tokens from `step_finish` events.
  - **Dynamic Catalog**: `GET /api/v1/zxa/connections/o/models` queries `opencode models` CLI dynamically inside the container.
  - **Custom Base URL Support**: Supports self-hosted Ollama or vLLM deployments via `baseUrl`.

---

## 3. Server Installation Procedures

Follow these steps when installing ZXA on a new machine or server:

### A. Linux / VPS / Cloud Server
```bash
# 1. Ensure Docker, Docker Compose, and Node.js (>=24) are installed
docker --version
node -v

# 2. Run the automated Linux setup script
./packages/zxa/docker/setup-zxa.sh
```

### B. Windows Server / Development Machine
```powershell
# Run the automated PowerShell setup script
.\packages\zxa\docker\setup-zxa.ps1
```

### C. Verify Server Health with ZXA Doctor
```bash
npm run zxa:cli -- doctor
```
Expected output:
```
🩺 Running ZXA Environment & Server Preflight Diagnostics...

✅ ZXA Runtime Service: Reachable at http://127.0.0.1:4230 (status: ok, agent: zxa)
✅ ZXA Web UI: Serving at http://127.0.0.1:4230/
✅ Provider Configuration State: Reachable
✅ Gemini Models Endpoint: Functional
✅ Google AI Studio Network Access: Reachable

-------------------------------------------------------------
🎉 ZXA Doctor: All preflight checks PASSED. Ready for requests!
```

---

## 4. Connecting & Testing Models on New Server

### Via Web Browser:
1. Open **`http://127.0.0.1:4230/`** (or run `npm run zxa:cli -- open gemini` or `npm run zxa:cli -- open opencode`).
2. **For Gemini**:
   - Click **"Get Gemini API Key in Google AI Studio ↗"** to generate a key.
   - Paste the key and click **"Fetch Latest from Google"** to verify and view live models.
   - Click **"Save & Connect"**.
3. **For OpenCode**:
   - **Free Mode (1-Click)**: Select a free model (e.g. `opencode/nemotron-3-ultra-free` or `opencode/mimo-v2.5-free`) and click **"⚡ Connect Free Built-in LLM"** (no API key required).
   - **API Key / Custom Mode**: Enter your API key (Anthropic, OpenAI, OpenRouter, DeepSeek) or custom base URL for local Ollama and click **"Save & Connect"**.
4. Use the built-in **"Test Connection"** panel to send a test prompt and verify response latency and tokens.

### Via Command Line:
```bash
# Check status of all providers
npm run zxa:cli -- status

# OpenCode: list available models (dynamic from container CLI)
npm run zxa:cli -- models opencode

# OpenCode: 1-click connect with free built-in inference
npm run zxa:cli -- connect opencode --free

# OpenCode: test connection with prompt
npm run zxa:cli -- test opencode "Hello from OpenCode!"

# Gemini: view available latest models
npm run zxa:cli -- models gemini

# Gemini: connect with automatic selection of the latest model
npm run zxa:cli -- connect gemini <YOUR_API_KEY> --latest

# Gemini: test connection
npm run zxa:cli -- test gemini "Hello from new server!"

# Parallel test across all connected providers
npm run zxa:cli -- test parallel "What is the capital of France?"
```

---

## 5. Maintenance Checklist for Server Upgrades

When updating dependencies or rotating credentials:
- **CLI updates in persistent runtime volume**:
  ```bash
  docker exec zxa /app/update-zxa.sh check
  docker exec zxa /app/update-zxa.sh apply-cli
  docker restart zxa
  ```
- **Image rebuild after server code edits**:
  ```bash
  npm run zxa:build
  docker compose -f packages/zxa/docker/compose.json up -d --force-recreate --wait
  ```
- **Credential Rotation**:
  Keys are kept in `zxa-state` volume (`/state/connections.json`). They survive container recreations and image rebuilds.
