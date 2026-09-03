# Versioning and GitHub

CODEXSUN OS uses lockstep versions for the root package and all npm workspaces.

The release tag is `v-<version>`. The changelog label is `v <version>`.

The active changelog is `assist/documentation/CHANGELOG.md`.

Use these commands:

```text
npm run version:show
npm run version:bump -- --title "<title>" --no-database-update
npm run check:versions
npm run github:now -- --dry-run
npm run github:now
```

Use `--database-update` when a release contains a database change.

A version bump creates a changelog section with database and app codebase notes.

`github:now` lists changed files and shows a bordered commit review. It then asks whether to bump the version, accepts the changelog subject as the default commit message, and requires final confirmation before pull, commit, or push. A version bump started from this flow detects database-related paths in the current Git changes.

Do not bump, commit, tag, or push unless the user explicitly requests that mutation.
