# NEOT LMS Assist Guide

This folder contains architectural and operational guidance for the NEOT LMS module.

## Navigation
1. Read `architecture/study-management-ddd.md` for the Domain-Driven Design model and bounded contexts.
2. Read `SKILL.md` before making changes to the learning curriculum, assessment evaluation, or cloud sync protocol.

## Boundaries
- NEOT owns its API routes under `/api/v1/neot/*`.
- NEOT owns its SQLite database and migrations in `apps/neot/api/migrations`.
- NEOT communicates with other modules only via public package contracts or HTTP APIs. It does not touch other module databases.
- The web app is mobile-first and responsive.
