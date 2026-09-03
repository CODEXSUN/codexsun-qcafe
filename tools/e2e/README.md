# Isolated browser fixture

This service implements a deterministic subset of DevKit Messenger and the Agent Crew message contract.
It does not run a model or contact real users. Never configure a production installation to use it.

Run the fixture in Docker with port 9051 bound to loopback.
Mount this directory read-only at `/fixture` in `node:24-alpine` and run `node /fixture/fixture.mjs`.
Set `ZETRO_AGENTS_FILE` to the absolute path of `agents.json` for the test development process.
Set `ZETRO_E2E_TOKEN` to `e2e-fixture-token` for that process only.
Start the repository with `npm.cmd run dev`.

In Chat, connect to `http://127.0.0.1:9051` with the fixture token.
Select E2E Contact. Send a message and verify acknowledged content and cleared input.
Send `E2E reject`. Verify the error and retained draft.
Toggle mute, archive, and restore. Switch to Zetro and verify the Chat session remains connected.
In Zetro, send a message and verify the explicitly labeled fixture response.
Start a new conversation, resume the saved session, and reload to verify browser persistence.

After testing, restart development without fixture environment variables and stop the fixture container.
Actual DevKit delivery and real model execution require separate authenticated integration tests.
