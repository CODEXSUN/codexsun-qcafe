# Configuration and operational storage

JSON owns installation configuration. SQLite owns local operational records. Secrets stay in environment variables or a secret store.

| Owner | Configuration | Operational data |
| --- | --- | --- |
| Platform | Application manifests and environment-selected providers | Existing MariaDB lifecycle, identity, events, and outbox |
| Zetro | Validated settings JSON and agent registry JSON | Projects, conversations, workflow snapshots, and events in SQLite |
| AI Task System | Planner configuration | Tasks and task events in its own SQLite database |
| ZXA | Docker configuration and reviewed agent definitions | Provider credentials and runtime releases in isolated volumes |

Zetro migrates legacy SQLite settings to JSON only when the JSON file does not exist. It retains the legacy row for recovery. Invalid JSON fails explicitly.

Set `ZETRO_SETTINGS_FILE` to override the JSON path. By default it is beside the workspace database with `.settings.json` appended.

Run `npx tsx packages/zetro/api/src/seed-workspace.ts` from the repository root to add the first CODEXSUN OS and Zetro sample. Use the same database environment overrides as the server. Stable IDs prevent replacement of existing records. This seed starts no agents.

## Cloud boundary

Platform already supports MariaDB. Zetro and AI Task System currently use synchronous SQLite repositories. They do not yet support MariaDB selection.

Before centralizing these modules, change their public repository ports to asynchronous methods and implement module-owned MariaDB adapters. Preserve transaction boundaries, migration ledgers, record IDs, event order, and approved settings. Use independent module schemas and credentials. Never read another module's tables.

JSON remains installation configuration in cloud deployments. Mutable user preferences belong in a module database when multiple API processes must update them. The local JSON settings writer assumes one API process.

Cloud cutover requires export, backup, migration, row-count validation, restart tests, and a rollback plan. No database URL should silently select a different provider.
