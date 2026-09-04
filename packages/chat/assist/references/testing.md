# Chat testing

Keep all Chat behavior suites in `packages/chat/test`.

Test these boundaries when they change:

- Domain membership and conversation invariants.
- Actor-specific preferences and read state.
- Authentication and authorization failures.
- API validation and response envelopes.
- Message history ordering and pagination.
- Repository and event adapter contracts.
- Central and DevKit web transport paths.
- Message reconciliation and failed-send draft retention.
- Host composition through public exports.

Run:

```powershell
npm.cmd run typecheck --workspace @codexsun/chat-contracts
npm.cmd run typecheck --workspace @codexsun/chat-api
npm.cmd run typecheck --workspace @codexsun/chat-web
npm.cmd run test --workspace @codexsun/chat-test
npm.cmd run build --workspace @codexsun/chat-web
npm.cmd run assist:validate
npm.cmd run check
```

State fixture, source, local runtime, and deployed verification separately.
Do not claim realtime, persistence, or multi-user behavior from type checks alone.
