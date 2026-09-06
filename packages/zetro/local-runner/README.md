# Zetro local tools

This package owns the first host-side tool runner. It serves three read-only MCP tools to Zetro in Docker.
The selected folder defaults to `packages/zetro/local-runner/template`. The model cannot select another root.

| Tool | Operation | Limit |
| --- | --- | --- |
| workspace_list | List allowed files and folders | 200 entries |
| workspace_read | Read UTF-8 text | 64 KiB |
| workspace_search | Search literal text | 100 entries, 30 matches, three-second scan budget |

## Development start

Set `CODEXSUN_ZETRO_DOCKER=true` in the root `.env`.
Build `zetro:v1` with `docker compose -f packages/zetro/docker/compose.json build`.
Run `npm.cmd run dev` from the repository root.

The development launcher starts the local runner and generates a private token for each startup.
It passes the same token to the container. Do not start Compose separately afterward, because that removes the generated token.
Restart through `npm.cmd run dev` to restore the connection.

The runner binds to `127.0.0.1:4160` on Windows. Docker Desktop connects through `host.docker.internal:4160/mcp`.
The token authorizes access to one selected workspace for this local operator. It does not provide multi-user isolation.
The container receives file content through tool results. It has no host folder mount or host shell.

Use the prompt in [task-template.md](template/task-template.md). Enable Activity in the composer to see completed tool calls.
Activity appears with the final response in this version. The host console records tool names, status, and duration without file contents or tokens.

## Scope and controls

To select another folder later, set `ZETRO_WORKSPACE_ROOT` to an absolute path in the root `.env`, then restart.

## Zetro Desk Bridge

The installed Windows desktop does not send a local folder path to the cloud API. It uses a separate local bridge instead.

Run this once from the CODEXSUN repository after Docker Desktop is ready:

```powershell
npm.cmd run zetro:desk
```

The command starts only the `zxa:v1` Docker agent and three loopback-only services:

- `127.0.0.1:4151` is the private desktop Zetro coordinator. It owns local work cases, tasks, workflow runs, and reviewed knowledge.
- `127.0.0.1:4160` is the authenticated, read-only MCP tool server.
- `127.0.0.1:4161` is the desktop bridge. It is authenticated with a private key held outside the web view.

Desktop chat and task actions pass through the coordinator before reaching ZXA. This preserves one durable timeline from prompt through evidence and an optional Orship handoff. The bridge exposes a fixed coordinator route allowlist to the Tauri web view; it is not an open HTTP proxy.

## Execution targets

Zetro Desk stores the selected execution target with its local properties:

- **Local CLI** uses the signed-in Codex CLI for chat-only requests. It disables the shell tool and uses the read-only sandbox.
- **Local Docker** is the default. It routes Codex, Gemini, and OpenCode through the isolated ZXA container at `127.0.0.1:4230`.
- **VPS Docker** routes requests to an operator-provided HTTPS ZXA URL. Windows Credential Manager stores its bearer token.

The desktop bridge owns a loopback runtime router on port `4162`. The Zetro coordinator calls this stable endpoint, and the router forwards each request to the selected target. Changing the target does not change Zetro conversation or task storage.

The cloud proxy exposes its ZXA container below `/zxa/`. Use `https://os.codexsun.com/zxa` as the VPS URL after the matching cloud release is deployed. The ZXA bearer token remains required.

The bridge stores its private configuration under `%APPDATA%\CODEXSUN\zetro-desk-bridge.json`. It includes the approved repository root and local tokens. Do not copy that file, add it to source control, or expose either port beyond the local computer.

In Zetro properties inside the desktop app, choose an existing repository root and save it. The bridge validates and canonicalizes that local path, then the Docker agent can use only `workspace_list`, `workspace_read`, and `workspace_search`. The cloud cannot browse the desktop repository. Cloud synchronization requires a reviewed DCS application adapter and is not implied by the local coordinator.

Run the command again after Docker is stopped or when you need to recreate the local Zetro container. It does not start the general development portal or unrelated Docker services.
Only select a trusted folder intended for model access. Selected text can be sent to the connected model provider.
Hidden paths, credential filenames, non-text types, links, hard-linked files, and traversal paths are denied.
Canonical paths must remain inside the selected root. Do not allow untrusted processes to replace files during reads.
This is a local application boundary, not an operating-system sandbox against a hostile user on the same PC.

The runner rejects browser origins, unknown hosts, missing tokens, oversized requests, and unsupported operations.
The model receives no file-write, patch, command, Git, or execution tool. Add those only through a separate reviewed change.
Codex shell access remains disabled. Agent-generated execution must remain in an approved isolated provider.

## Extend one tool at a time

1. Define the input schema and read-only behavior in `src/mcp.mjs`.
2. Implement filesystem access through `WorkspaceTools`.
3. Add denied-input tests and a successful MCP contract test.
4. Add the tool to the container's explicit allow list.
5. Run the repository check and the live smoke test.

Run `npm.cmd test -w @codexsun/zetro-local-runner` for local boundary tests.
Run `npm.cmd run smoke -w @codexsun/zetro-local-runner` after startup and Codex sign-in for a live model test.
The smoke test uses the model account and asserts both returned content and all three tool activities.

The bridge uses [Codex's documented Streamable HTTP MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).
