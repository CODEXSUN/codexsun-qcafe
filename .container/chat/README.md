# Chat container runtime

The Chat API is an app-owned service. It listens on port `4160` and exposes
REST endpoints plus WebSocket events at `/api/v1/chat/events`.

## Local development

Run the API from the repository root:

```powershell
npm.cmd run dev -w @codexsun/chat-api
```

Use `http://127.0.0.1:4160` and send an `x-chat-actor` header for local
development requests. This identity header is a temporary local contract; the
next persistence/authentication slice must replace it with the DevKit public
identity contract.

## Docker

Copy the variables into a private `.container/deploy.env` file:

```text
CHAT_BIND_ADDRESS=127.0.0.1
CHAT_API_PORT=4160
```

Start the service:

```bash
docker compose --env-file .container/deploy.env -f .container/chat/docker-compose.yml up --build
```

Verify it without creating chat data:

```bash
curl http://127.0.0.1:4160/health
```

The first container slice intentionally has no database volume because the
message store is still in-memory. Do not deploy it for durable conversations
until the MariaDB migration and DevKit identity adapter are added.
