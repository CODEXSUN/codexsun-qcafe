# NEOT Study Management - Domain-Driven Design (DDD) Specification

## 1. Domain Overview & Bounded Contexts

NEOT LMS operates within the **Study Management** bounded context, modeling the lifecycle of structured knowledge acquisition, teaching cohorts, discussions, and evaluation.

```
+-------------------------------------------------------------------------+
|                        Study Management Context                         |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                          Curriculum Core                          |  |
|  |   [CourseAggregate] ---> [SubjectEntity] ---> [LessonAggregate]   |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +---------------------------+       +-------------------------------+  |
|  |       Cohort & Class      |       |      Assessment & Quizzes     |  |
|  |  [ClassScheduleAggregate] |       |       [QuizTestAggregate]     |  |
|  |     [EnrollmentEntity]    |       |      [QuizQuestionEntity]     |  |
|  |                           |       |      [QuizAttemptEntity]      |  |
|  +---------------------------+       +-------------------------------+  |
|                                                                         |
|  +---------------------------+       +-------------------------------+  |
|  |       Questions & Q&A     |       |       Remote Sync Engine      |  |
|  |      [QuestionEntity]     |       |       [SyncStatusSummary]     |  |
|  |       [AnswerEntity]      |       |          [SyncSnapshot]       |  |
|  |  [DiscussionPostEntity]   |       |          target: neot.in      |  |
|  +---------------------------+       +-------------------------------+  |
+-------------------------------------------------------------------------+
```

## 2. Layer Definitions

### Domain Layer (`src/domain/`)
- Pure business logic, invariants, and calculations.
- Aggregates maintain transaction consistency boundaries.
- No network, file system, or database awareness.

### Application Layer (`src/application/`)
- Orchestrates use cases by coordinating domain aggregates and infrastructure ports.
- `StudyService`: Course authoring, lesson browsing, progress tracking.
- `AssessmentService`: Quiz evaluation, score calculation, pass thresholding.
- `NeotSyncService`: Snapshot export/import and remote exchange with `neot.in`.
- Ports (`ports.ts`): Define contracts for repository persistence and cloud integration.

### Infrastructure Layer (`src/infrastructure/`)
- `SqliteNeotRepository`: Concrete implementation using Node.js `node:sqlite` (`DatabaseSync`).
- `NeotCloudClient`: HTTP communication adapter for `https://neot.in`.
- Deterministic SQL migrations and sample courses seeds.

### Interfaces Layer (`src/interfaces/http/` & `web/`)
- `NeotRouter`: REST endpoints under `/api/v1/neot/*`.
- `server.mjs`: Standalone lightweight HTTP server.
- `apps/neot/web`: Mobile-first responsive React frontend.
