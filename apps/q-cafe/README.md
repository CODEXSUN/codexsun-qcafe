# Q Cafe

Q Cafe owns its restaurant UI, API, SQLite database, migrations, Windows desktop runtime, and Docker runtime.
The platform registers its URL. Shared UI and topology tools use public package exports.
Chat and Zetro links open their existing workspaces. They do not receive restaurant records or operator keys.

## Start locally

Run `npm run dev:q-cafe` from the repository root for local development.
Sign in with the four-digit cashier PIN. It is `1234` by default for local development; set `QCAFE_CASHIER_PIN` in `apps/q-cafe/.env` before using the application with real restaurant data.
The launcher keeps a private technical API token in `apps/q-cafe/.local/operator-key.txt`; the browser never receives this token.
The script also stores the local SQLite database in the same ignored directory.
Open http://127.0.0.1:5180. The local development server opens the dashboard directly.
The cashier PIN opens a 12-hour browser session. Restarting the API invalidates active sessions.
The API listens on port 4180. Both published ports bind to loopback.

Run `npm run q-cafe:token` when you need a new development token.
Run `npm run build:q-cafe` to create the production web build.
Copy `apps/q-cafe/.env.example` to the ignored `apps/q-cafe/.env` to configure a separate local installation.
Run `docker compose -f apps/q-cafe/docker/compose.json up -d --build` for the isolated Docker runtime.

The demonstration configuration seeds eight menu items and four stock records.
Orders and bookings start empty. Records persist in the `q-cafe_q-cafe-data` volume.
SQL migrations run once, in filename order, inside transactions.
Do not delete the volume when you update the application.

## Independent domain

Set `QCAFE_WEB_URL` in the platform environment to the Q Cafe HTTPS URL.
Set `VITE_CODEXSUN_URL` and `VITE_ZETRO_URL` when building the Q Cafe web app.
Serve the built web directory on that domain and proxy `/api/v1/q-cafe` to the private API.
Set `QCAFE_DATABASE_PATH` to an app-owned persistent path and `QCAFE_DEMO=false` for an unseeded database.
The development Vite server is for local preview. Domain registration, TLS ingress, user identity, and production deployment are separate setup work.

## Current workflows

- POS creates orders and kitchen tickets with server-owned menu prices.
- Kitchen tickets move from queued to preparing, ready, and served.
- Inventory records manual stock adjustments and their reasons.
- Bookings hold a table for two hours and reject overlapping reservations.
- The dashboard calculates order value, kitchen counts, stock alerts, and reservations from the database.

Payments, tax invoices, printing, recipe consumption, menu administration, booking cancellation, and multi-user permissions are not implemented.
The operator key represents one trusted restaurant operator. This is a local operational foundation, not a production fiscal POS.

## Windows desktop

Q Cafe includes an app-owned Tauri desktop base at `apps/q-cafe/desktop`.
Rust owns the Windows shell and starts the app-owned Node API. React renders the same Q Cafe workspace for web and desktop. The desktop database lives in the Windows application-data directory, separate from the source checkout and web deployment.

Run `npm.cmd run dev:q-cafe:windows` after installing the desktop workspace dependencies. Run `npm.cmd run build:q-cafe:windows` to build MSI and NSIS installers. The current package expects Node.js on the Windows target, or `QCAFE_NODE_BINARY` pointing at a managed Node runtime. A signed Node sidecar is the next packaging stage.

## Sync and activity foundation

Every Q Cafe operational table has a local `sync_id`, `sync_status`, `sync_version`, and `sync_updated_at`. SQLite changes are marked `pending` from their first write. The authenticated `GET /api/v1/q-cafe/sync/pending` endpoint exposes a future cloud adapter payload without sending any data itself.

The `activities` table records orders, kitchen state changes, bookings, inventory adjustments, and stock movements. Recent activity appears on the dashboard.

## Verify

Run `npm run check` inside an isolated container with Git and the repository available.
Run `npm run build -w @codexsun/q-cafe-web` in the same environment.
API tests cover pricing, kitchen transitions, inventory limits, booking conflicts, migration reruns, and database persistence.
