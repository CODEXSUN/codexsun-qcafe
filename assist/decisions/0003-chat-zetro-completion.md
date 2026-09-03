# Chat and Zetro implementation plan

## Scope and ownership

Core composes applications. It does not own contacts, messages, conversations, or agent behavior.
`packages/chat/web` owns Chat, DevKit transport, authenticated session state, and conversation controls.
`packages/zetro/web` owns agent selection, conversation history, prompts, activity, and response presentation.
Agent Crew remains Docker-only. Shared UI owns layout, navigation slots, and visual tokens.

## Delivery sequence

1. Replace hard-coded divider colors and remove double borders.
2. Replace sample Chat data with the versioned DevKit Messenger HTTP contract.
3. Add authenticated connection, contact selection, history, sending, read state, archive, mute, and refresh.
4. Add Zetro session history, resume, search, export, agent details, and useful activity states.
5. Verify workspace ownership, type checks, builds, transport failures, and browser interactions.

## Acceptance criteria

Chat must not show fabricated contacts or mark an unsent message delivered.
The API must acknowledge a message before the UI presents it as sent.
A failed send must retain the draft and show a recoverable error.
Switching conversations must not mix history or drafts.
Credentials must not enter source code, exported history, or browser persistent storage.
Zetro must retain selected-agent identity when a conversation resumes.
New conversation must reset the conversation without deleting previous history.
Every enabled control must perform its named action.
Home and feature topology labels must remain separate.
Divider colors must match the shared border token in light and dark themes.

## Verification boundaries

Use fixtures for deterministic API contract and error tests.
Use the actual DevKit instance for authenticated read and delivery checks when a session is available.
Sending to real contacts requires an explicitly approved test recipient.
Use an actual configured Docker specialist to verify model output.
Report unavailable credentials or providers as open acceptance criteria, never as passing E2E tests.

## Risks

DevKit authentication and CORS are external integration requirements.
The existing Zetro API assumes a trusted local operator. Remote multi-user access needs a separate authentication design.
Conversation history stored in this browser does not provide server migration or cross-device synchronization.

## Verification results on 2026-09-03

The repository check passed, including four Chat transport tests and three Zetro history tests.
Core and standalone Zetro production builds passed with bundle-size warnings.
The browser loaded authenticated contacts and history from the isolated Docker fixture.
A successful Chat send appeared after acknowledgement and cleared the draft.
A rejected send retained the draft and showed the fixture error.
Mute changed to Unmute after the preference request succeeded.
Zetro returned the labeled fixture response through its real API dispatcher.
New conversation and resume preserved the saved specialist session.
Archived history remained available after reload.
Switching modules preserved the in-memory Chat connection.
Light and dark workspace dividers were inspected in the browser.

Live DevKit verification remains open. Port 9050 refused the connection.
No live contact received a test message. No real model execution was verified.
Attachments, reactions, presence, group chat, and offline queues remain outside this implemented feature set.
Zetro history remains browser-local. Server history synchronization is not implemented.
