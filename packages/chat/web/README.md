# Chat add-on

`@codexsun/chat-web` owns the reusable Chat workspace, session state, transport adapters, and standalone UI.
`@codexsun/chat-contracts` owns shared types.
`@codexsun/chat-api` owns the central backend.

Run `npm.cmd run dev:chat` to start the API at `http://127.0.0.1:4165` and the app at `http://127.0.0.1:5176`.

## Bind Chat to an app

Install the workspace dependency and bind the public add-on factory to the host desk.

```tsx
import { createChatWorkspaceAddon } from "@codexsun/chat-web";
import { MainMdi } from "@codexsun/ui-desk";

const chat = createChatWorkspaceAddon({
  defaultApiUrl: "https://chat.example.com",
});

export function App() {
  return <MainMdi addons={[chat]} />;
}
```

The factory uses the central Chat API by default.
Use `transportFactory` when an app has a different backend.
The factory must return the exported `ChatTransport` contract.

The compatibility export `chatWorkspaceAddon` uses the DevKit Messenger adapter. Core imports this export as one consumer.
Shared UI does not own Chat data or transport.

Enter the DevKit API origin and an existing DevKit access token in Connect DevKit.
The token stays in memory. Disconnect clears the token, contacts, messages, and drafts.
Remote origins require HTTPS. DevKit must allow the CODEXSUN web origin through CORS.
The documented local DevKit API origin is `http://127.0.0.1:9050`.

Supported operations are direct contacts, conversation creation, paged history, send, read, mute, archive, copy, and export.
Refresh polls every five seconds while the document is visible.
The client keeps a separate draft per conversation and reconciles messages by UUID.
Attachments, reactions, presence, group chats, and offline send queues are not implemented in this delivery.

Run `npm.cmd run test --workspace @codexsun/chat-test` for all Chat checks.
Run `npm.cmd run build --workspace @codexsun/chat-web` for the standalone production build.
See `tools/e2e/README.md` for browser fixture verification.
