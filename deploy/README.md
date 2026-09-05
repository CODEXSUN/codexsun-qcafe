# CODEXSUN OS staged deployment

Compose project: codexsun-os. Cloudflare Tunnel origin: http://os-codexsun-web:80.

The web service joins the existing cxapp-network. DCS remains on a private internal network, port 4170. Nginx forwards /dcs/ws with WebSocket headers. Chat is a separate service; it never shares the DCS socket listener.

Build the Portal with npm run build -w @codexsun/core-web and copy its dist contents into deploy/portal. Provision deploy/config/devices.json with device IDs, trusted scopes, and token hashes. Keep raw tokens on the enrolled device. Provision deploy/state/dcs with ownership for container UID 1000.

Run docker compose -f deploy/compose.json up -d --build --wait on the target machine. Do not delete volumes or existing containers as part of this command. Retain the previous deployment for rollback.

## Restart-safe deployment

Use `deploy/publish-vps.ps1` from the repository root. It builds and packages the Portal, packages only tracked source, stages both archives on the VPS, validates Compose, creates a rollback image tag, rebuilds only affected images, and records a timestamped log in `/home/codexsun-os/.deploy-runs`.

The VPS script `deploy/apply-vps.sh` is idempotent. If SSH or a build fails, run the same command again. It uses a deployment lock, atomically switches validated Portal assets, retains a rollback image tag and previous Portal assets in its run folder, and leaves configuration, databases, volumes, and project files untouched. Do not delete the lock while another deployment is running.

The deployment exposes authenticated Identity, Zetro, Task System, and Chat APIs at https://os.codexsun.com.
Identity and Chat use separate MariaDB schemas. Zetro and Task System use persistent SQLite files.
Redis carries Chat notifications and Platform queue entries. File Browser serves the dedicated project directory through `/files/`.
File Browser requires the Platform operator session. Its command runner is disabled.

Each service receives its own environment file. ZXA never receives the operator password or database credentials.
`bootstrap-vps.py` provisions dedicated schemas and preserves existing accounts. The operator password comes from ignored `config/operator.env`.
Do not print or commit these files. The root `.env` contains the local operator credential.

Build cloud frontend assets with `VITE_OS_CLOUD=true`. Desktop builds use their own cloud URL configuration and Windows credential storage.
Recreate the web container after replacing its mounted Nginx configuration. Dynamic upstream DNS supports application container replacement.

Run `node deploy/verify-live.mjs` from the repository root to check authenticated APIs, enrollment, DCS replay, and Chat WebSockets.
The test creates and revokes a verification device. It does not print credentials.

## Verified on September 5, 2026

- Public Zetro returned a real Codex response through ZXA.
- A sample task completed planning, execution, review, and the approval endpoint.
- Task results survived a Zetro restart.
- Device enrollment, reconnect replay, and the separate Chat WebSocket passed before and after service restarts.
- File Browser login and resource listing returned HTTP 200 through the authenticated gateway.
- Repository checks, web build, and desktop Rust check passed.

## Remaining acceptance work

Physical desktop and phone enrollment is not proved by transport tests. Native Android and iOS applications are not packaged yet.
Offline task and chat outboxes, conflict handling, and device-to-application sync adapters still require implementation and tests.
Chat message delivery between two real users still requires an end-to-end test. Socket readiness alone does not prove delivery.

Run node packages/dcs/src/live-check.mjs <private-client-config.json> to verify publish, acknowledgment and replay after reconnect. The private file contains url and token. No token is printed.
