# Changelog - NEOT LMS

## 0.2.0 - 2026-09-05

### Added
- **Interactive Code Sandbox (`CodeSandbox.tsx`)**: Live browser-based playground for HTML, CSS, and JavaScript with instant preview rendering, tab switching, and one-click code bundle export to assignments.
- **Evidence & Assignment Submissions (`0002_evidence_attendance_certificates.sql`)**: Domain aggregates for `AssignmentAggregate` and `AssignmentSubmissionEntity`, REST endpoints for submitting project artifacts and URLs, and mentor grading/feedback mechanisms.
- **Class Attendance & Roll-Call Registry**: Domain aggregates for `AttendanceSessionAggregate` and `AttendanceRecordEntity`, modal for creating session agendas, cohort member check-in, and status breakdown (`present`, `late`, `absent`, `excused`).
- **Verifiable Academic Certificates**: Cryptographically signed credentials generated upon course mastery, backed by SHA-256 verification hash, printable credential view (`CertificateModal.tsx`), and verification lookup API matching `https://neot.in`.

## 0.1.0 - 2026-09-05

### Added
- Initial standalone NEOT LMS module and study management app in CODEXSUN OS.
- 4-layer Domain-Driven Design (DDD) backend architecture in `apps/neot/api`.
- Domain aggregates: Course, Subject, Lesson, LessonProgress, ClassSchedule, Enrollment, QuizTest, QuizQuestion, QuizAttempt, Question, Answer, DiscussionPost.
- SQLite persistence using native Node.js `DatabaseSync` with transactional SQL migrations and seeds.
- Cloud synchronization adapter connecting with `https://neot.in`.
- Mobile-first responsive web application in `apps/neot/web` with bottom bar navigation on mobile and top tabs on desktop.
- Interactive Study Management view, quiz runner with instant scoring, class schedule viewer, community Q&A, and progress analytics.
- Local launcher `tools/start-neot.mjs` and token manager `tools/neot-token.mjs`.
- Internal assist documentation in `apps/neot/assist/`.
