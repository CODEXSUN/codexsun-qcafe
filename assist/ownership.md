# Module ownership

`manifest.json` is the repository ownership registry.

Each module has one owner, source roots, public contracts, and protected paths.

The Framework owns the ownership contract. Platform owns this registry and the repository audit command.

Run `npm.cmd run assist:doctor` before cleanup, a large refactor, or a cross-module change.

Use `npm.cmd run assist:doctor -- --json` for the full machine-readable report.

The command reports source duplicates. It does not authorize deletion.

Use these result classes:

- `safe-remove`: An owner approved an exact unused target list.
- `needs-migration`: The code is active but should use a shared public contract.
- `intentional-boundary`: Similar behavior has different module ownership.
- `needs-owner-decision`: The audit cannot safely classify the finding.

Never delete a protected path from an audit result. Propose a target list with evidence first.
