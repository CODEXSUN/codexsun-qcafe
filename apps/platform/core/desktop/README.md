# CODEXSUN Desktop

This package is the thin Windows shell for the CODEXSUN interface in `../web`.

- React owns the shared interface.
- Tauri and Rust own the native window and desktop status contract.
- Node owns the local API services.
- Docker owns Zetro and Agent Crew execution.

Run `npm.cmd run dev:desktop` from the repository root. The desktop runtime helper reuses a healthy local stack or starts `npm.cmd run dev` when the APIs and web server are not running.

Run `npm.cmd run check:desktop` to validate Rust without opening a window. Run `npm.cmd run build:desktop` to build the shared web interface and the Windows application.

The first production scaffold expects the local Node and Docker services at their configured loopback ports. Bundling those services as signed sidecars is a separate packaging step; the Rust shell does not execute agent-generated code.
