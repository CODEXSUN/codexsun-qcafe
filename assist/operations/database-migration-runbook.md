# Database Migration Runbook

Before migration, identify owner, existing-schema compatibility, rollback/recovery implications, and seed order. Apply structural migrations idempotently through the Platform ledger. Never treat `CREATE TABLE IF NOT EXISTS` as an existing-schema upgrade.

Verify fresh install, existing database upgrade, repeatable seed, protected defaults, restart persistence, and tenant isolation when enabled. Record skipped live database checks explicitly.
