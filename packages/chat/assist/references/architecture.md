# Chat architecture

## Folder ownership

| Folder | Responsibility | Public package |
|---|---|---|
| `contracts` | DTOs, validation schemas, route prefix, event shapes | `@codexsun/chat-contracts` |
| `api` | Domain, use cases, ports, adapters, and HTTP composition | `@codexsun/chat-api` |
| `web` | Reusable workspace, clients, standalone host, and topology | `@codexsun/chat-web` |
| `test` | Domain, contract, API, adapter, and composition tests | `@codexsun/chat-test` |
| `assist` | Maintained Chat guidance | Not a runtime package |

## Domain rules

- A direct conversation has exactly two different actors.
- Only members can read, send, mark read, or change preferences.
- Archive and mute values belong to one actor.
- The API acknowledges a message before the web workspace shows it as sent.
- Message identifiers are stable and support idempotent client reconciliation.
- Contacts come from an identity port. Chat does not own user accounts.

## Integration

Use `createChatModule` to compose the backend with identity, repository, and event adapters.
Use `createChatWorkspaceAddon` to bind the frontend to an application desk.
Use `CentralChatClient` for the owned API contract.
Use `DevKitChatClient` only for the DevKit Messenger contract.

The in-memory repository and local event bus are development adapters.
Replace them through ports for MariaDB, Redis, NATS, or another deployment target.
Do not change the domain or HTTP contract for an infrastructure replacement.

## Scale boundaries

Start as one modular monolith process.
Use one database transaction for a message and its outbox event when durable persistence is added.
Use a shared event transport before running multiple API replicas.
Keep WebSocket gateways stateless after shared pub/sub exists.
Add tenant and organization scope to identity and repository keys before multi-tenant deployment.
