# ZXA isolated runtime

ZXA is the first reusable agent runtime behind Zetro Desk. It provides three independent provider connections and can call them in parallel.

## Endpoints

- `POST /c/messages` or `/api/v1/zxa/c/messages`: Codex
- `POST /g/messages` or `/api/v1/zxa/g/messages`: Gemini CLI
- `POST /o/messages` or `/api/v1/zxa/o/messages`: OpenCode CLI
- `POST /api/v1/zxa/messages`: configured default provider
- `POST /api/v1/zxa/parallel`: selected providers in parallel
- `GET /api/v1/zxa/providers`: safe connection status and model details
- `POST /api/v1/zxa/images/inspect`: image dimensions, format, color space, channels, and size
- `GET /api/v1/zxa/updates`: installed runtime release and last update status
- `POST /api/v1/zxa/updates/check`: inspect the current runtime release
- `POST /api/v1/zxa/updates/apply`: apply CLI updates or stage reviewed agent definitions

All API requests require `Authorization: Bearer <ZXA_LOCAL_TOKEN>`. A message request uses `{ "message": "...", "conversationId": "optional UUID" }`. Parallel requests may also include `{ "providers": ["c", "g", "o"] }`.

Image requests accept up to three PNG, JPEG, WebP, or GIF attachments with a combined decoded size of 2.5 MB:

```json
{
  "message": "Describe this image",
  "attachments": [
    { "name": "screen.png", "mimeType": "image/png", "data": "base64-data" }
  ]
}
```

Codex receives images through its local image input. Gemini and OpenCode receive the isolated local file reference and extracted metadata. Temporary files are deleted after the request.

When `ZETRO_TOOLS_TOKEN` is configured by Zetro Desk, the Codex provider also receives three read-only MCP tools for the user-approved desktop repository: `workspace_list`, `workspace_read`, and `workspace_search`. ZXA never mounts the repository into the container. Gemini and OpenCode do not receive these tools.

## Build and run

```powershell
./packages/zxa/docker/setup-zxa.ps1
docker exec -it zxa codex login --device-auth
docker exec zxa /app/update-zxa.sh check
docker exec zxa /app/update-zxa.sh apply-cli
```

`setup-zxa.ps1` builds the ZXA connection page, recreates only the ZXA container,
waits for its health check, and confirms that `http://127.0.0.1:4230/` is serving
the page. It retries a Docker completion failure once. Use `-SkipWebBuild` or
`-SkipImageBuild` only when that asset is already known to be current.

Set `CODEXSUN_ZXA_DOCKER=true` to register ZXA with Zetro during `npm.cmd run dev`. Configure provider secrets in the root `.env`. Codex device state, Gemini configuration, and OpenCode authentication remain in the `zxa_zxa-state` volume. The isolated workspace remains in `zxa_zxa-workspace`.

Provider requests run separately, with one active request allowed per provider. `/parallel` can therefore run Codex, Gemini, and OpenCode concurrently. The container has no host checkout or Docker socket mount, runs as a non-root user, and uses a read-only root filesystem.

## Controlled updates

`apply-cli` installs the latest Codex, Gemini, and OpenCode CLIs into a new release directory in the persistent `zxa-runtime` volume. It only changes the `current` link after every package installs successfully. Existing releases remain available for diagnosis or rollback. Restart the container after an update so every subprocess uses the new CLI path.

Agent definitions never update themselves. Stage a HTTPS JSON document with its expected SHA-256 checksum, review the staged file, and explicitly activate that revision:

```sh
/app/update-zxa.sh stage-agent-files https://example.test/zxa-agents.json <sha256>
/app/update-zxa.sh activate-agent-files <sha256> --reviewed
```

The document must contain an `agents` array. Every item needs `id`, `name`, `duty`, and `skills`; see `agent-files.example.json`. The API exposes the same operations through `POST /api/v1/zxa/updates/apply` with targets `cli`, `agent-files`, and `activate-agent-files`.
