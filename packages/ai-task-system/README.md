# AI — Artificial Intelligence Task System

## Purpose and features

**AI — Artificial Intelligence Task System**

### Why this module exists

Turn reviewed requests into persistent, tracked work.

### Features and boundaries

Rule planner; work items; task service; worker port; SQLite task and event storage; task workspace. Execution depends on the supplied worker. MariaDB adapter remains pending.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


AI Task System is a reusable application module for collecting human requests, refining them into explicit objectives, planning ordered work, assigning capable agents, and recording execution evidence.

The module owns its contracts, domain model, application service, persistence adapter, HTTP API, and workspace UI. Hosts compose it through public exports. It does not access Zetro internals or another application's database.

Current lifecycle:

```text
request -> refined prompt -> planned work -> manual start -> agent execution -> review
```

Agent execution is supplied through the `TaskWorker` port. CODEXSUN currently binds that port to Zetro's Docker-backed dispatcher.
