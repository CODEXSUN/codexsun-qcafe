# Q Cafe changelog

## 1.1.5 - 2026-09-07

### Open Windows desktop maximized

- Q Cafe now opens its Windows desktop workspace maximized by default while retaining the standard title bar and taskbar access.

## 1.1.4 - 2026-09-07

### Clear thermal receipts and empty POS startup

- Replaced the prefilled POS-1 demonstration order with an empty new order and focused the catalog search field at startup.
- Improved 80mm thermal bill and settlement prints with a clear, consistent print font and slightly larger receipt text.

## 1.1.3 - 2026-09-07

### Single Q Cafe version source

- Q Cafe now opens its Windows desktop workspace maximized by default while retaining the standard title bar and taskbar access.

## 1.0.8 - 2026-09-06

### Windows installer process shutdown

- The NSIS installer closes the Q Cafe process tree before replacing files, including the Q Cafe Node sidecar.
- In-app updates stop and wait for the local Node API before launching the verified installer.
## 1.0.7 - 2026-09-06

### Windows updater repair

- Uses Windows-native TLS trust for GitHub update checks, including locally trusted enterprise or proxy certificates.
- Shows the exact update-check or installer error in Settings instead of replacing it with a generic message.
## 1.0.6 - 2026-09-06

### First setup data controls

- Added owner-first-setup actions to select the D: database folder or start with an empty local SQLite database.
- Preserves existing backup history when starting with empty data and restarts the local API after either confirmed change.
- Added the installed Q Cafe version at the login screen bottom-right.
- Added Settings actions to check the verified GitHub stable release and install a downloaded, checksum-verified update.
## 1.0.5 - 2026-09-06

### Windows startup and release tags

- Creates the Q Cafe runtime log folder before starting the local API, preventing a first launch from closing when the folder is absent.
- Aligns Q Cafe update manifests and release tooling with the `qcafe-<version>` GitHub release tag.

## 1.0.4 - 2026-09-06

### Windows startup repair

- Packaged the staff authentication module and staff identity migration into the desktop API runtime.
- Added a local API health check before Q Cafe opens its desktop workspace.
- Added an API startup log in the selected data folder and a clear local-service error message in the sign-in screen.
- Existing SQLite business data remains in place; startup now applies the missing migration before serving the local API.

## 1.0.3 - 2026-09-06

### Local desktop verification

- Completed the local Windows desktop verification path with a PIN-based cashier sign-in and staff activity records.
- Added daily SQLite backups to the configured data drive and retained application settings separately from business data.
- Kept Q Cafe in local desktop mode for customer verification; cloud synchronization remains a later release.

### POS and tables

- Refined the keyboard-first POS entry screen and the table-and-chair selection flow, including grouped seat selection for a bill.
- Added separate POS bill, POS item, receipt, and payment transaction records with SQLite migrations and sync metadata for future cloud use.

### Release preparation

- Aligned root, web, desktop, Rust, and Tauri versions at 1.0.3.
- Prepared versioned NSIS, WiX MSI, ZIP, checksums, and `qcafe-update.json` assets.
- Added guarded release tooling that verifies a clean source tree, runs checks and builds, then can tag and publish the GitHub release.

## 0.1.5 - 2026-09-04

### POS billing

- Added restaurant tables, POS bills, POS items, receipts, and receipt transactions to the Q Cafe SQLite database.
- Added taxable amount, GST percentage, GST amount, grand total, partial payments, split payments, transaction references, denominations, sync metadata, and activities.
- Reworked POS into a keyboard-first billing table with table number, chairs, item code, item name, quantity, rate, and amount.

### Windows installer

- Aligned the Tauri, Rust, and npm package versions at 0.1.5.
- Added the Windows application icon required by WiX.
- Added MSI and NSIS packaging, copied to versioned `qcafe-0.1.5-*` installer names.
- Created the local SQLite database, migrations, menu, and floor tables automatically on first desktop launch.

## Installer files

- `qcafe-0.1.5-x64-setup.exe` is the NSIS installer.
- `qcafe-0.1.5-x64.msi` is the WiX installer.
