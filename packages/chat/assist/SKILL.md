---
name: chat-module-owner
description: Build, change, review, or scale the CODEXSUN Chat bounded context under packages/chat, including contracts, API, web add-on, tests, identity adapters, persistence adapters, realtime delivery, and Chat visuals.
---

# Chat module ownership

The repository routes Chat work here from `assist/README.md`.
Read `../README.md` and this file before searching or changing Chat.

Keep all Chat behavior under `packages/chat`.
Do not create `apps/chat` or copy the Chat workspace into another application.
Applications must bind Chat through public package exports.

## Dependency direction

Use this direction only:

```text
web and HTTP interface -> application -> domain
infrastructure -> application ports
test -> public package exports
```

The domain must not import Fastify, React, a database driver, an identity provider, or another application.
The application layer must depend on ports for persistence, identity, time, and events.

## Change workflow

1. Read [references/architecture.md](references/architecture.md) for backend, contracts, or integration changes.
2. Read [references/visuals.md](references/visuals.md) for workspace or interaction changes.
3. Read [references/testing.md](references/testing.md) before changing behavior or adapters.
4. Update the public contract before implementations when a boundary changes.
5. Add or update tests in `../test` for each changed invariant.
6. Run the focused Chat checks and the repository check.

Keep credentials in runtime configuration or memory.
Do not put tokens in source, local storage, logs, events, or exported transcripts.
Do not promote runtime output into this skill without product-owner review.
