# CODEXSUN OS

CODEXSUN OS is a control plane for building, deploying, and operating isolated applications from one codebase.

The first runtime includes a module registry, an orchestration API, a builder-agent boundary, and a React control plane.
It does not run untrusted code on the host. Execution providers must supply an isolated runtime.

## Start

Requirements:

- Node.js 24 LTS or newer
- npm 11 or newer

Install and start both services:

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`. The API listens on `http://localhost:4100`.

Press `Ctrl+C` once to stop both development processes. The startup command will not select alternate ports.

Startup stops existing process trees on ports 4100 and 5173. Set `OS_DEV_PORT_POLICY=abort` to disable replacement.

The database preflight checks `DATABASE_URL` when configured. Set `OS_DATABASE_REQUIRED=true` to make it mandatory.

## Workspace

```text
apps/platform/control-plane/api   Fastify control-plane API
apps/platform/control-plane/web   React control-plane interface
packages/contracts    Shared runtime contracts
packages/runtime      Module registry and orchestration state
assist                Architecture, rules, decisions, and skills
```

Read [assist/README.md](assist/README.md) before you change the runtime.
