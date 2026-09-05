# DCS — Device Communication Service

## Abbreviations

| Term | Full name | Meaning here |
| --- | --- | --- |
| DCS | Device Communication Service | Durable communication between trusted devices |
| WS | WebSocket | Persistent connection protocol |
| WSS | WebSocket Secure | WebSocket over TLS |
| TLS | Transport Layer Security | Encryption for connections |
| API | Application Programming Interface | Public module interface |
| ACK | Acknowledgment | Confirmation that an event was persisted |
| ID | Identifier | Stable device or event reference |
| SHA-256 | Secure Hash Algorithm, 256-bit | Hash used to store device token references |
| VPS | Virtual Private Server | Cloud host for DCS |
| JSON | JavaScript Object Notation | Event and configuration format |
| SQL | Structured Query Language | Database query language used by SQLite |

SQLite is a product name. Zetro and ZXA are product names, not expanded abbreviations.

## Purpose and features

**DCS — Device Communication Service**

### Why this module exists

Transport device events independently of chat and application business rules.

### Features and boundaries

Authenticated WebSocket connections; scoped event storage; durable acknowledgments; duplicate suppression; reconnect replay; heartbeat. Uses port 4170 and SQLite. App-specific data application and device enrollment UI remain pending.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


Device Communication Service owns a durable, scoped event stream. It does not execute messages or import another module's tables.

Port 4170 serves `/health` and `/ws`. Chat remains on its separate service port. Native clients authenticate the WebSocket upgrade with a bearer token. Browsers cannot connect until an explicit allowed origin and browser authentication flow exist.

The server reads device IDs, scopes and SHA-256 token hashes from DCS_DEVICES_FILE. Raw device tokens remain on the device. Provisioning currently requires an operator-managed file and restart. Mobile enrollment and revocation UI are pending.

Publish `{type:"publish",id:"unique-id",payload:{...}}`. The server acknowledges only after persistence. Reuse the same ID and payload on retry. Conflicting reuse is rejected.

Pull `{type:"pull",after:0}` to replay up to 100 events from the authenticated device scope. Persist the last applied sequence locally and continue pulling until caught up. Live availability notifications are hints; the database is authoritative.

This is transport-level synchronization. App-specific conflict resolution and automatic application of projects, tasks, and chats require module adapters and are not implemented here.
