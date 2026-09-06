# CODEXSUN Docs

This application owns the documentation workspace.

The API stores every page in the configured MariaDB database. Docs does not read local Markdown files.

## Cloud database contract

Platform migration `docs.pages.v1` creates the `docs_pages` table before Docs starts.
The table stores the slug, title, one-line summary, group, body, author, and create and update times.

Desktop and web clients use `GET /api/v1/docs` for available pages.
They can use `GET /api/v1/docs/status` to check MariaDB readiness, the migration name, table name, and document count.
The authenticated cloud endpoint is available through the VPS at `/api/v1/docs`.

The workspace uses a safe MDX subset. It renders headings, lists, code blocks, and Mermaid diagrams. It does not run JavaScript expressions or imported components from documentation files.

## Run locally

1. Set `DATABASE_URL` or `DOCS_DATABASE_URL` for MariaDB-backed Docs.
2. Start the API with `npm.cmd run start -w @codexsun/docs-api`.
3. Start the web app with `npm.cmd run dev -w @codexsun/docs-web`.
4. Open `http://127.0.0.1:5185`.

The API listens on `4185`. The standalone web app listens on `5185`.
