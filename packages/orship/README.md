# Orship

Orship is a reusable domain module for planned software releases. It is separate from AI Task System, Zetro, DCS, and deployment scripts.

## Ownership

The module owns release-operation records, phase transitions, release events, review history, SQLite persistence, and the `/api/v1/orship` transport contract.

The workspace console shows local release events and the cloud runner state from the release-state contract. Orship does not execute Git, Docker, or a deployment provider. The desktop release routine does that work and records each phase through this module's public API.

## Operation history

The History workspace joins every completed, failed, or cancelled operation with its complete event timeline. It records the project, environment, title, version, source revision, outcome, duration, failure evidence, and event details. An operator can store a durable review status and notes for later audits and follow-up work.

Existing release operations need no import. The history read model builds from the existing operation and event tables. The additive review tables store the current decision for fast display and an append-only decision timeline without changing historical operation snapshots.

Public history routes:

- `GET /api/v1/orship/history` lists terminal operations and supports `q`, `phase`, and `projectKey` filters.
- `GET /api/v1/orship/history/:id` returns one operation with its full evidence timeline.
- `PUT /api/v1/orship/history/:id/review` stores `pending`, `reviewed`, or `action_required` with review notes.

It stores references to a project, AI Task System task, source revision, and version. It does not read those modules' tables or import their private files.

## Lifecycle

```text
planned -> awaiting_approval -> approved -> published -> deploying -> running
                                              \-> failed
```

The application service publishes a domain event through a port after each transition. A host may bind that port to DCS. The module never runs Git, Docker, or shell commands. Zetro Desk and the cloud runner remain the approved execution adapters.

## Composition

Use the public contracts package for shared DTOs. Compose `ReleaseOperationService` with a repository and event publisher. Register routes through `registerReleaseOperationRoutes`.

## Standalone local service

Start Orship without Zetro or another agent.

```powershell
npm.cmd run dev -w @codexsun/orship-api
```

The service listens on `http://127.0.0.1:4190`. Set `ORSHIP_DATABASE_FILE` to choose its SQLite database location. The shared `npm.cmd run dev` stack starts it too.

The first adapter uses SQLite for local persistence. A MariaDB repository and DCS publisher can be added later without changing domain behavior.
