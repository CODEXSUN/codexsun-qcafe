# Zetro Knowledge Loop

This Zetro-owned module preserves reviewed operational context across model sessions.

It owns a local SQLite ledger and a serial durable queue for prompts, plans, task events, evidence, learning proposals, and project index entries. `Chronicle` records runs, `Atlas` indexes bounded repository metadata, and `Recall` searches scoped records for the next request.

Learning proposals are candidates only. This module never changes skills, prompts, rules, or source files without an operator review.

## Retrieval providers

SQLite is the local source of truth and includes bounded lexical search. MariaDB can become the cloud source of truth for synchronized records. A future optional Qdrant adapter stores embeddings only; it never replaces the audited SQLite or MariaDB record. A local embedding model is selected through a reviewed provider configuration, with lexical retrieval as the safe fallback when it is offline.

Start the optional local semantic services only when they are needed:

```powershell
npm.cmd run zetro:knowledge:semantic
```

This starts local-only Qdrant on `127.0.0.1:6333` and Ollama on `127.0.0.1:11434`. Pull an embedding model only after choosing and reviewing it; the services do not download one automatically.
