# Zetro local container

## Implementation plan

1. Build one `zetro:v1` image with Node, Python, Codex CLI/SDK, the minimal API, and the compiled Zetro web app.
2. Run as a non-root user with a read-only root filesystem. Persist Codex credentials and workspace data in separate Docker volumes. Do not mount the host repository or Docker socket.
3. Authenticate from inside the container with `codex login --device-auth`. The user completes authorization in their browser. Never copy host credentials.
4. Route CODEXSUN's Zetro API to the container through the existing agent message contract. Keep the platform a generic app host.
5. Verify health, unauthorized access, standalone web delivery, and an actual prompt response with provider and token usage. A healthy HTTP process alone does not prove model access.
6. Extend the provider boundary with selectable Codex models and OpenAI-compatible providers. Add validated provider configuration, separate credentials, cancellation, and integration tests before exposing selection controls.
7. Add persistent model conversations, reviewed skills, media processing, and Docker-only specialist dispatch. These are follow-up stages, not features of this first text-response runtime.

## Run

From the repository root:

```powershell
npm.cmd run build -w @codexsun/zetro-web
docker compose -f packages/zetro/docker/compose.json build
docker compose -f packages/zetro/docker/compose.json up -d --wait
docker exec -it zetro-v1 codex login --device-auth
docker exec zetro-v1 codex login status
```

Open http://127.0.0.1:4220 for the standalone app. The port is bound only to loopback. Set `CODEXSUN_ZETRO_DOCKER=true` in the root `.env`, then run `npm.cmd run dev` to connect the host app. This flag overrides the Zetro demo registry; other local demo services remain independent.

The initial gateway token defaults to `local-demo-only`. Set `ZETRO_LOCAL_TOKEN` to override it for both the container and host API. This is a local development configuration, not public deployment authentication.

The API accepts text at `POST /api/v1/zetro/messages` for the same-origin standalone web app and bearer-authenticated `POST /api/v1/messages` for the host dispatcher. Requests use `{ "agentId": "zetro", "message": "Hello" }`. Media is explicitly rejected until connected. Each prompt starts a fresh Codex thread. Only one prompt runs at a time, with a 120-second timeout.

Codex runs in read-only mode with shell tools disabled and no approval escalation. Model network access is required. Web search is disabled. Python is installed but is not exposed as an execution tool in this version.

The development launcher now connects the [local read-only tool runner](../local-runner/README.md). It gives Codex three scoped host-file tools through authenticated MCP. Start through `npm.cmd run dev` to supply the private tool token. A direct Compose startup without that token leaves local tools disabled.

## Persistence and migration

`zetro_zetro-state` contains account credentials and Codex state. `zetro_zetro-workspace` contains the isolated working directory. Container recreation preserves both. Do not use `down -v` unless you intend to erase them. Stop the container before taking a consistent volume backup; encrypt the credential archive. To migrate, transfer the image and both volume backups to the target Docker host, restore them with user ID 1000 ownership, and start the same Compose configuration. Volume export/restore automation is a later stage.

Device authentication can require enabling device-code login in account security settings. See [Codex authentication](https://developers.openai.com/codex/auth/).
