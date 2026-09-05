---
name: develop-neot-lms
description: Instructions and guidelines for developing, extending, and maintaining the NEOT LMS Study Management module.
---

# Develop NEOT LMS

Read `apps/neot/README.md` and `apps/neot/assist/architecture/study-management-ddd.md`.

## Key Invariants
1. **Curriculum Hierarchy**:
   - Courses own Subjects.
   - Subjects own Lessons.
   - Lessons own Questions.
   - Questions own Answers.
   - Tests and Quizzes evaluate comprehension with configurable pass percentages.
2. **Domain Layer Independence**:
   - Never import HTTP, database, or UI libraries into `apps/neot/api/src/domain/`.
   - All domain state changes occur through aggregate methods.
3. **Synchronization**:
   - All operational tables have `sync_id`, `sync_status`, `sync_version`, and `sync_updated_at`.
   - Default remote target is `https://neot.in`.
4. **Verification**:
   - Always run `node --test apps/neot/api/src/neot.test.mjs` after API changes.
   - Always run `npm.cmd run build -w @codexsun/neot-web` after UI changes.
