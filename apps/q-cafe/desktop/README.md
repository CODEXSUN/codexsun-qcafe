# Q Cafe Windows application

The Windows application packages the Q Cafe React web build, Node runtime, and app-owned API in Tauri. The API creates its SQLite database at `%APPDATA%\\in.codexsun.qcafe\\q-cafe.sqlite` on first launch. It runs every Q Cafe migration and seeds the starter menu and floor tables without modifying an existing database.

The MSI and NSIS installers include `node.exe`, so a Windows machine does not need a separate Node.js installation. `QCAFE_NODE_BINARY` remains available only for a managed runtime override.

Run `npm.cmd run dev:q-cafe:windows` for desktop development. Run `npm.cmd run build:q-cafe:windows` to produce versioned `qcafe-<version>-x64-setup.exe` and `qcafe-<version>-x64.msi` installers after the Tauri dependencies are installed.

The desktop app is local-first. It records pending sync metadata in SQLite but does not contact a cloud service until a Q Cafe cloud adapter is configured.
