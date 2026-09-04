# Module Boundaries

Use a flat module folder. A real role must have executable behavior; do not create placeholder files.

```text
{module}.module.ts       composition and dependencies
{module}.service.ts      use cases and decisions
{module}.repository.ts   owned persistence only
{module}.routes.ts       fixed public transport
{module}.events.ts       published and consumed events
{module}.migration.ts    owned structural migration
{module}.worker.ts       real background work
{module}.seed.ts         repeatable defaults
{module}.sync.ts         real synchronization policy
{module}.types.ts        DTOs and owned records
index.ts                 intentional public exports
```

A reduced synchronous module documents its omitted capabilities in its module definition. Composition roots register modules and adapters; they never contain product CRUD.
