# Zetro orchestration delivery

Zetro owns the engineering agent experience. CODEXSUN hosts its public add-on.
The supplied master prompt is the roadmap; its Devkit name does not rename Zetro.

## Local vertical slice

Zetro has a Docker runtime identity. It can answer directly or coordinate selected
specialists. The run engine creates explicit dependency records for planning,
specialist contributions, and Zetro synthesis. A failed dependency prevents
synthesis. The Tasks workspace displays persisted runs and their actual results.

The local engine permits one active run, with bounded provider timeouts and no
automatic retries. Checkpoints use atomic file replacement under
`packages/zetro/api/state/runs`, or `ZETRO_STATE_DIR`. On restart, unfinished
runs become interrupted. An operator can retry unfinished tasks; completed tasks
are retained. An interrupted provider call may already have produced a response.
This retry contract is suitable for answer generation, not irreversible tools.

## Evidence rules

A completed response is not proof that source code was implemented or verified.
Observe, Plan, Implement, Typecheck, Test, and Review must use execution evidence.
Unknown model names, tokens, costs, and files remain unreported. The current
Docker demonstration generates explicitly labeled simulated replies.

## Remaining delivery stages

1. Multimodal provider contract: validated image and audio inputs, transcription,
   image understanding, generated artifacts, and provider capability discovery.
2. Reviewed tool scopes and repository snapshots in Docker, with real diffs,
   typecheck and test results, independent review, and repair budgets.
3. Structured model-generated task decomposition, nested dependencies, bounded
   concurrency, cancellation, idempotency, and durable attempt history.
4. MariaDB checkpoints and audit records, organization authorization, approval
   gates, cost budgets, and model routing.
5. Deployment adapters, rollback evidence, reviewed memory proposals, and
   operational monitoring.

Do not expose this trusted local API publicly before authorization and durable
multi-process concurrency controls are implemented. No automatic commits,
production changes, or self-approved learning are part of the local slice.
