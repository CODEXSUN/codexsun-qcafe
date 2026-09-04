# Agent Orchestration

Agents plan, inspect, implement, verify, and report evidence. Generated code executes only through approved isolated providers.

Parallel work requires a parent run, declared file scopes, dependency order, isolated worktrees, budgets, and a human merge/approval gate. A failed child is retried or reviewed independently; it must not silently alter sibling scope.
