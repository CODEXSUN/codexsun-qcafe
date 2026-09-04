# Chat visual behavior

Use the shared CODEXSUN desk, shadcn components, semantic color tokens, and Interface Topology Overlay.

Keep the conversation list in the side car.
Keep the active conversation, history, and composer in the main canvas.
Do not add duplicate conversation panels to the canvas.

Keep direct chats and device chats in separate workspaces.
Show a clear empty state when no conversation is selected.
Keep one draft per conversation.
Do not clear a draft after a failed send.

Use relaxed spacing and readable text.
Align avatars, titles, previews, timestamps, and unread badges in stable vertical lanes.
Use semantic theme tokens in light and dark themes.
Give each icon-only control an accessible name and tooltip.

Do not show unavailable features as successful actions.
Attachments, calls, reactions, presence, groups, and deletion need public contracts before full enablement.
Update `web/src/topology.ts` when a mapped region changes.
