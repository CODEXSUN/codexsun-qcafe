# Q Cafe changelog

## 1.1.20 - 2026-09-09

### Responsive login and reliable Windows updates

- Keeps the sign-in screen within one responsive viewport, with the login card centered independently of the floating Exit and version controls.
- Makes the Exit control easier to see and asks for confirmation before safely closing the local API and SQLite connection.
- Makes the Windows installer close Q Cafe and its bundled Node sidecar by its installed path before replacing node.exe during an update.
- Publishes version metadata through apps/q-cafe/version.json for the API, web app, desktop app, updater, installer, and changelog.

## 1.1.19 - 2026-09-09

### POS workflow, receipt clarity, and safe desktop exit

- Simplified POS-1 for counter use: category controls align with the order header, item-code entry is separated from a blank waiting-list reserve, and saved bills open in a dedicated drawer.
- Keeps ordered quantities at one or more; the remove action is now the only way to delete a row.
- Improved the 70 mm receipt with clear item-header rules and a totals divider while keeping optional receipt information blank when it is not configured.
- Adds a login-screen Exit action that gracefully closes the local API and SQLite connection before stopping its Q Cafe sidecar, with a bounded force-stop fallback.
- Retains the daily pre-start SQLite backup and uses the Q Cafe version source for the API, web, desktop, updater, installer, and changelog.

## 1.1.18 - 2026-09-08

### Receipt preview and desktop safety

- Q Cafe now uses apps/q-cafe/version.json as the single source for its API, web, desktop, updater, installer, and changelog version.
- Keeps receipt preview inside a compact Q Cafe dialog. Preview never opens the Windows print dialog.
- Blocks title-bar close requests and provides a deliberate Exit Q Cafe action in System & Runtime.
- Uses simple incremental customer bill numbers and migrates existing POS bill numbers without altering business totals, receipts, or backup history.
- Refines the 70 mm thermal layout, removes the hard-coded tear footer, and keeps blank optional receipt fields out of printed slips.
- Moves Q Cafe update manifests, release assets, tags, and future updater checks to CODEXSUN/codexsun-qcafe.
- Runs Q Cafe API tests, web build, version validation, and Windows packaging as its release gate without relying on unrelated platform workspaces.

## 1.1.17 - 2026-09-07

### Master catalog, POS billing, and Windows delivery

- Q Cafe uses `apps/q-cafe/version.json` as the single version source for its API, web app, Windows desktop app, updater, installer, and changelog.
- Replaced the starter menu with the customer Tamil catalog, assigned simple sequential item codes, and added SQLite migrations that preserve existing business data.
- POS-1 category filters now use the Item Master catalog. The new Categories tab changes a category once and updates every matching item and POS filter.
- Kept an empty new order on load. Collected bills appear only when the cashier uses the page controls, in a table format with a single green outer status border, collected-page total, and green `PAID · CASH` stamp.
- Kept Clear available at all times so cashiers can reset an unsaved order and return focus to item search.
- Improved 70 mm thermal receipts, optional receipt details, Windows printer and direct-print controls, and the Windows installer shutdown flow.

## 1.1.6 - 2026-09-07

### Thermal receipts and printer controls

- Printed receipts now omit GST details when GST is not applied, and omit the FSSAI license label when no license number is configured.
- Added Windows default-printer and direct-print settings. Direct print skips the in-app receipt preview and opens the system print flow.
- Removed phone and branch-counter lines from printed headers, hid empty restaurant fields, and simplified the POS-1 footer to totals only.

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
