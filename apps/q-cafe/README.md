# Q Cafe

Q Cafe owns its restaurant UI, API, database, migrations, and Docker runtime.
The platform registers its URL. Shared UI and topology tools use public package exports.
Chat and Zetro links open their existing workspaces. They do not receive restaurant records or operator keys.

## Start locally

Run `npm run dev:q-cafe` from the repository root for local development.
The script creates a private development token on its first run and prints it in the terminal.
It reuses the token from `apps/q-cafe/.local/operator-key.txt` on later runs.
The script also stores the local SQLite database in the same ignored directory.
Open http://127.0.0.1:5180. The local development server opens the dashboard directly.
Production and Docker builds still require the operator token on the sign-in screen.
The API listens on port 4180. Both published ports bind to loopback.

Run `npm run q-cafe:token` when you need a new development token.
Run `npm run build:q-cafe` to create the production web build.
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

## Verify

Run `npm run check` inside an isolated container with Git and the repository available.
Run `npm run build -w @codexsun/q-cafe-web` in the same environment.
API tests cover pricing, kitchen transitions, inventory limits, booking conflicts, migration reruns, and database persistence.
