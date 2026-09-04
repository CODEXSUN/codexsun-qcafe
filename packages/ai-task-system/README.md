# AI Task System

AI Task System is a reusable application module for collecting human requests, refining them into explicit objectives, planning ordered work, assigning capable agents, and recording execution evidence.

The module owns its contracts, domain model, application service, persistence adapter, HTTP API, and workspace UI. Hosts compose it through public exports. It does not access Zetro internals or another application's database.

Current lifecycle:

```text
request -> refined prompt -> planned work -> manual start -> agent execution -> review
```

Agent execution is supplied through the `TaskWorker` port. CODEXSUN currently binds that port to Zetro's Docker-backed dispatcher.
