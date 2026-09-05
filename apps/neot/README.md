# NEOT LMS - Study Management Platform

**Learn today. Own tomorrow.**

NEOT is an organisation-based learning platform for students and masters, targeting [neot.in](https://neot.in). It integrates structured learning, classes, questions & answers, assessments, progress tracking, and cloud synchronization in one unified, mobile-first workspace.

## Purpose and Features

### Why this module exists
Keep study management and curriculum delivery independently deployable, modular, and resilient. NEOT provides students and masters with a zero-friction learning experience, operable offline with local SQLite persistence while seamlessly synchronizing with `https://neot.in`.

### Features & Boundaries
- **Curriculum Hierarchy**: Organisation &rarr; Course &rarr; Subject &rarr; Lesson &rarr; Question &rarr; Answer.
- **Interactive Code Sandbox**: Live HTML, CSS, and JS editor with real-time preview and one-click submission.
- **Evidence & Project Submissions**: Real-world assignment submissions, scoring, and mentor feedback.
- **Cohort Attendance & Roll-Call**: Session agendas and student attendance tracking (`present`, `late`, `absent`, `excused`).
- **Verifiable Academic Certificates**: Cryptographic SHA-256 verifiable credentials with printable certificate view.
- **Scheduled Classes**: Cohorts connect masters and students to scheduled course delivery.
- **In-Lesson Discussions & Live Q&A**: Question and answer boards with verified master solutions.
- **Measured Assessments**: Timed and untimed quizzes with instant evaluation, scoring, and pass/fail evidence.
- **Study Progress & Performance**: Track completed lessons, view percentage completions, and review quiz attempt history.
- **Cloud Synchronization**: Bidirectional snapshot exchange with `https://neot.in` with conflict resolution.
- **Mobile-First Responsive Web**: Bottom navigation bar on mobile viewports and rich desktop layouts.

### Architecture & Domain-Driven Design (DDD)
NEOT strictly adheres to the 4-layer Domain-Driven Design pattern:
1. **Domain Layer** (`apps/neot/api/src/domain`):
   - Pure domain business logic, invariants, and rules with zero framework dependencies.
   - Aggregates & Entities: `CourseAggregate`, `SubjectEntity`, `LessonAggregate`, `LessonProgressEntity`, `ClassScheduleAggregate`, `EnrollmentEntity`, `QuizTestAggregate`, `QuizQuestionEntity`, `QuizAttemptEntity`, `QuestionEntity`, `AnswerEntity`, `DiscussionPostEntity`, `AssignmentAggregate`, `AssignmentSubmissionEntity`, `AttendanceSessionAggregate`, `AttendanceRecordEntity`, `CertificateAggregate`.
   - Domain Errors & Events.
2. **Application Layer** (`apps/neot/api/src/application`):
   - Orchestration services: `StudyService`, `AssessmentService`, `NeotSyncService`.
   - Port contracts: `INeotRepository`, `INeotCloudClient`, `IEventBus`.
3. **Infrastructure Layer** (`apps/neot/api/src/infrastructure`):
   - `SqliteNeotRepository`: Node.js native `DatabaseSync` (`node:sqlite`) with WAL mode, foreign keys, and atomic transactions.
   - `NeotCloudClient`: HTTP client connecting to `https://neot.in`.
   - Automatic migrations (`migrations/*.sql`) and seed data (`seeds.mjs`).
4. **Interface / Presentation Layer**:
   - `NeotRouter` (`apps/neot/api/src/interfaces/http`): REST router under `/api/v1/neot/*`.
   - `server.mjs`: Standalone Node HTTP server listening on port 4250.
   - Web App (`apps/neot/web`): React 19, Tailwind, Lucide React, and `@codexsun/ui` running on port 5250.

## Start Locally

Run the NEOT development stack from the repository root:

```powershell
npm.cmd run dev:neot
```

Or run the services individually:

```powershell
# API (Port 4250)
node apps/neot/api/src/server.mjs

# Web (Port 5250)
npm.cmd run dev -w @codexsun/neot-web
```

Local endpoints:
- Web App: `http://127.0.0.1:5250`
- API Health: `http://127.0.0.1:4250/health`
- API Base: `http://127.0.0.1:4250/api/v1/neot`

Run `npm.cmd run neot:token` to generate a new operator API token.

## Connecting to neot.in

1. Open the **Cloud Sync** tab in the web app or click the `neot.in` badge in the header.
2. Set your cloud sync token or operator key.
3. Click **Pull from neot.in** to download remote snapshots or **Publish to neot.in** to upload local student progress and quiz attempts.
4. The cloud client respects `NEOT_CLOUD_URL` in `.env`, defaulting to `https://neot.in`.

## Verification

Run the automated test suite:

```powershell
node --test apps/neot/api/src/neot.test.mjs
npm.cmd run build -w @codexsun/neot-web
npm.cmd run check
```
