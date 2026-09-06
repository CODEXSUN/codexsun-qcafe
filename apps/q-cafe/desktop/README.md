# Q Cafe Windows application

The Windows application packages the Q Cafe React web build and Node runtime in Tauri. On launch, the desktop executable writes its app-owned API and every migration into the selected data folder's `runtime\\api` directory before starting it. The API creates or upgrades `q-cafe.sqlite` in that folder without replacing existing business data.

The MSI and NSIS installers include `node.exe`, so a Windows machine does not need a separate Node.js installation. `QCAFE_NODE_BINARY` remains available only for a managed runtime override.

Run `npm.cmd run dev:q-cafe:windows` for desktop development. Run `npm.cmd run build:q-cafe:windows` to produce versioned `qcafe-<version>-x64-setup.exe` and `qcafe-<version>-x64.msi` installers after the Tauri dependencies are installed.

The desktop app is local-first. It records pending sync metadata in SQLite but does not contact a cloud service until a Q Cafe cloud adapter is configured.

## Data folder and backups

On the first production launch, Q Cafe asks the operator to choose its data folder. Choose a durable local or mapped location such as `D:\Q Cafe Data`. The selected folder contains `q-cafe.sqlite` and a `backups` directory. The application installation may remain on C:.

Q Cafe stores only the folder selection and the last successful backup date in `%APPDATA%\\in.codexsun.qcafe\\settings.json`. This JSON file does not contain business records. If it is missing, Q Cafe asks for the data folder again and does not replace or delete an existing database.

At the first application start each day, Q Cafe creates a consistent SQLite backup before it starts the local API. Updates replace application files only; they retain both the settings JSON and the selected data folder.

If the local API cannot start, Q Cafe reports the startup failure instead of showing a generic fetch error. The API startup log is at `runtime\\q-cafe-api.log` inside the selected data folder.
