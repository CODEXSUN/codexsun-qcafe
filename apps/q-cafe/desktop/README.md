# Q Cafe Windows application

The Windows application packages the Q Cafe React web build and Node runtime in Tauri. On launch, the desktop executable writes its app-owned API and migrations into `%APPDATA%\\in.codexsun.qcafe\\runtime` before starting it. The API creates its SQLite database at `%APPDATA%\\in.codexsun.qcafe\\q-cafe.sqlite` and runs every Q Cafe migration without modifying an existing database.

The MSI and NSIS installers include `node.exe`, so a Windows machine does not need a separate Node.js installation. `QCAFE_NODE_BINARY` remains available only for a managed runtime override.

Run `npm.cmd run dev:q-cafe:windows` for desktop development. Run `npm.cmd run build:q-cafe:windows` to produce versioned `qcafe-<version>-x64-setup.exe` and `qcafe-<version>-x64.msi` installers after the Tauri dependencies are installed.

The desktop app is local-first. It records pending sync metadata in SQLite but does not contact a cloud service until a Q Cafe cloud adapter is configured.
