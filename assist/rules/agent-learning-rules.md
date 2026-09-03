# Agent learning rules

## Learning model

The system learns through evidence, evaluations, and reviewed refinements. It does not train model weights.

An observation records a run result. An evaluation compares that result with an acceptance criterion.

A refinement proposal contains evidence, scope, risk, and a suggested change. A person accepts or rejects it.

## Constraints

- Do not convert one failure into a global rule.
- Do not store secrets or private user content as learned guidance.
- Do not change a prompt, rule, tool, or source file without review.
- Keep the source evidence for every proposal.
- Version accepted refinements.
- Support rollback.
- Re-run evaluations after a refinement.

## Promotion

```text
observation -> candidate lesson -> evaluation -> review -> accepted refinement
```

Reject a proposal when evidence is incomplete, narrow, unsafe, or no longer current.
