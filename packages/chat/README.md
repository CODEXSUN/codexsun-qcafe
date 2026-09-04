# Chat add-on

Before Chat work, read `assist/SKILL.md`.
It routes architecture, visual, integration, scaling, and test work to focused references.

This folder is the only source owner for the CODEXSUN Chat feature.

`contracts` owns shared API and event types.
`api` owns the modular monolith backend.
`web` exports the reusable workspace, transport adapters, and standalone application.
`test` owns all Chat behavior suites.
`assist` records architecture, behavior, visual, and verification guidance.
Applications bind the public `@codexsun/chat-web` exports.
Applications must not copy Chat source or import internal files.

The add-on owns a central API server on port 4165.
Each application can use the central API, the DevKit adapter, or a custom `ChatTransport` factory.

See `web/README.md` for start commands and integration examples.

## Quick paths

- Public contracts: `contracts/src/index.ts`
- Backend composition: `api/src/chat-module.ts`
- Domain model: `api/src/domain/conversation.ts`
- Use cases: `api/src/application/chat-service.ts`
- Reusable web export: `web/src/index.ts`
- Central tests: `test`
- Agent guidance: `assist/SKILL.md`
