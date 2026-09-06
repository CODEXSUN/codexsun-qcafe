# CODEXSUN Docs

This application owns the documentation workspace.

The API stores pages in the configured MariaDB database. The initial cloud deployment seeds the empty Docs table from `apps/docs/content`. After that seed, every page read and write uses the database.

The workspace uses a safe MDX subset. It renders headings, lists, code blocks, and Mermaid diagrams. It does not run JavaScript expressions or imported components from documentation files.

## Run locally

1. Set `DATABASE_URL` or `DOCS_DATABASE_URL` for MariaDB-backed editing, or leave both unset for read-only local Markdown documents.
2. Start the API with `npm.cmd run start -w @codexsun/docs-api`.
3. Start the web app with `npm.cmd run dev -w @codexsun/docs-web`.
4. Open `http://127.0.0.1:5185`.

The API listens on `4185`. The standalone web app listens on `5185`.
