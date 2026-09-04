# Q Cafe Windows application

The Windows application packages the Q Cafe React web build in Tauri. Rust starts the app-owned Node API, and the API creates its SQLite database at `%APPDATA%\\in.codexsun.qcafe\\q-cafe.sqlite` on first launch. It runs every Q Cafe migration and seeds the starter menu and floor tables without modifying an existing database.

Install Node.js on the target Windows machine or set `QCAFE_NODE_BINARY` to the bundled Node runtime path. The next packaging stage can replace this operating-system dependency with a signed Node sidecar.

Run `npm.cmd run dev:q-cafe:windows` for desktop development. Run `npm.cmd run build:q-cafe:windows` to produce versioned `qcafe-<version>-x64-setup.exe` and `qcafe-<version>-x64.msi` installers after the Tauri dependencies are installed.

The desktop app is local-first. It records pending sync metadata in SQLite but does not contact a cloud service until a Q Cafe cloud adapter is configured.
