---
name: operate-development-server
description: Start, inspect, or recover the CODEXSUN OS development API and web stack with port and database preflight checks.
---

# Operate the development server

Run commands from the repository root with npm.

Use `npm run dev` to check ports, check the configured database, and start the full stack.

The default port policy stops the process tree on ports 4100 and 5173. Set `OS_DEV_PORT_POLICY=abort` to prevent this.

Set `OS_DATABASE_REQUIRED=true` when the current runtime requires the configured database.

Verify `/health`, the core API, and the web root after startup.

Do not report the database as verified when `DATABASE_URL` is absent.
