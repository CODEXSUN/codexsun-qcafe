# Chat workspace

Chat owns its DevKit API adapter, session state, contacts, conversations, and message UI.
Core imports `chatWorkspaceAddon`. Shared UI does not own Chat data or transport.

Enter the DevKit API origin and an existing DevKit access token in Connect DevKit.
The token stays in memory. Disconnect clears the token, contacts, messages, and drafts.
Remote origins require HTTPS. DevKit must allow the CODEXSUN web origin through CORS.
The documented local DevKit API origin is `http://127.0.0.1:9050`.

Supported operations are direct contacts, conversation creation, paged history, send, read, mute, archive, copy, and export.
Refresh polls every five seconds while the document is visible.
The client keeps a separate draft per conversation and reconciles messages by UUID.
Attachments, reactions, presence, group chats, and offline send queues are not implemented in this delivery.

Run `npm.cmd run test --workspace @codexsun/chat-web` for transport checks.
See `tools/e2e/README.md` for browser fixture verification.
