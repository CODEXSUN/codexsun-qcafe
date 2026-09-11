# CODEXSUN Services

CODEXSUN Services runs in the signed-in Windows session. It accepts authenticated local print jobs, sends them to the Windows default printer without a dialog, and verifies a product license with a configured HTTPS portal.

## Local contract

- `GET /health` returns agent availability.
- `POST /v1/print-jobs` accepts `{ id, title, content }` and queues a plain-text receipt.
- `POST /v1/license/configure` accepts `{ portalUrl, licenseKey, productId }`.
- `POST /v1/license/verify` posts `{ productId, installationId, licenseKey, agent }` to `<portalUrl>/api/v1/licenses/verify`.

All write endpoints require the `Authorization: Bearer` token supplied by the owning desktop application. The agent binds only to `127.0.0.1`.


