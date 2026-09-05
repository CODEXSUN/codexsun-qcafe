# CODEXSUN Docs

This application owns the documentation workspace.

Markdown and MDX files in `apps/docs/content` are the canonical source. The API indexes document metadata in SQLite. The index supports search and document activity without moving authored content into a database.

The workspace uses a safe MDX subset. It renders headings, lists, code blocks, and Mermaid diagrams. It does not run JavaScript expressions or imported components from documentation files.

## Run locally

1. Start the API with `npm.cmd run start -w @codexsun/docs-api`.
2. Start the web app with `npm.cmd run dev -w @codexsun/docs-web`.
3. Open `http://127.0.0.1:5185`.

The API listens on `4185`. The standalone web app listens on `5185`.
