# VPS — Virtual Private Server Integration

## Purpose and features

**VPS — Virtual Private Server Integration**

### Why this module exists

Manage provider integration behind a module-owned API.

### Features and boundaries

Hostinger MCP (Model Context Protocol) inventory; authenticated read-only routes; connection checker; safe error responses. Inventory access does not prove SSH or deployment readiness.

### Integration

Use this module's public exports or registered API contracts. Do not read another module's tables or import its private implementation.

Ownership is registered in `assist/manifest.json` at the repository root. Run `npm.cmd run check` from the root for repository validation.


Owner: Platform VPS. Public contract: `/api/v1/vps`.

This module uses Hostinger MCP over stdio, following the DevKit integration pattern. It exposes a fixed read-only inventory operation. It does not expose arbitrary MCP tools, SSH commands, deployment, or deletion.

## Configuration

Set `HOSTINGER_API_TOKEN` in the server environment. Set a separate `VPS_ACCESS_TOKEN` with at least 32 characters for access to this module. Keep both secrets out of frontend bundles and source control.

Requests require `Authorization: Bearer <VPS_ACCESS_TOKEN>`.

- `GET /api/v1/vps/status` reports configuration status. It does not claim live connectivity.
- `GET /api/v1/vps/servers` calls Hostinger and returns validated server IDs, hostnames, and states.

Missing access configuration fails closed. Provider failures return a generic error without provider output or credentials.

## Read-only connection check

From the repository root:

```text
node --import tsx apps/platform/core/api/src/modules/vps/vps-check.ts
```

Optionally append an environment-file path. The checker reads only HOSTINGER_API_TOKEN from that file, does not copy it, and prints only filtered inventory.

Successful inventory proves provider API authentication. It does not prove SSH, Docker, DNS, application health, or deployment readiness.

## Future operations

Before adding writes, integrate actor permissions through the public identity contract and persist audit records. Use explicit operation contracts, target selection, review, and verification. The current administrator token is for trusted server operators, not client or mobile distribution.

No database is required for read-only inventory. Desired deployments and operation history must have module-owned persistence when implemented.
