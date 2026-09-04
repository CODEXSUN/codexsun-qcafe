# CODEXSUN OS Governance Rules

## Ownership

Each entity, table, route, event, worker, seed, form, and workspace has one module owner. Shared code is limited to stable contracts, transport, configuration, observability, persistence adapters, and UI primitives.

## Contracts and security

Use fixed, schema-validated APIs. Deny access by default. Backend services enforce permissions. Platform resolves actor, entitlement, and tenant context; browsers and applications never select a tenant database or trust an unverified claim.

## Persistence

Provider selection comes from root `.env`. Migrations upgrade existing databases and have a ledger. Seeds are deterministic, repeatable, ordered, and protect user-owned records. Prove restart persistence when a database is configured.

## Tenancy

Single-client is the default application mode. Multi-tenant mode is explicit per application and uses a trusted server-side resolver. Prove isolation before claiming multi-tenant support.

## Quality

Every risky change has regression tests. Run boundary, type, focused, and production-build checks as applicable. Database and browser evidence are separate from static checks.
