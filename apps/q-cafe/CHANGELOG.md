# Q Cafe changelog

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
