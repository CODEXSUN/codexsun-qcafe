import test from 'node:test';
import assert from 'node:assert/strict';
import { CourseAggregate } from './domain/course.mjs';
import { LessonAggregate, LessonProgressEntity } from './domain/lesson.mjs';
import { QuizAttemptEntity, QuizQuestionEntity, QuizTestAggregate } from './domain/assessment.mjs';
import { SqliteNeotRepository } from './infrastructure/sqlite-repository.mjs';
import { StudyService } from './application/study-service.mjs';
import { AssessmentService } from './application/assessment-service.mjs';
import { NeotSyncService } from './application/sync-service.mjs';
import { NeotRouter } from './interfaces/http/neot-router.mjs';

test('CourseAggregate enforces invariants', () => {
  assert.throws(() => CourseAggregate.create({ title: 'A' }), /at least 2 characters/);
  const course = CourseAggregate.create({
    title: 'TypeScript Advanced Systems',
    description: 'Learn enterprise design',
  });
  assert.ok(course.uuid.length >= 16);
  assert.equal(course.code, 'typescript-advanced-systems');
  assert.equal(course.status, 'active');

  course.update({ title: 'TypeScript Core & Advanced' });
  assert.equal(course.title, 'TypeScript Core & Advanced');
});

test('QuizAttemptEntity accurately evaluates score and pass threshold', () => {
  const test = QuizTestAggregate.create({
    courseUuid: 'test_course_1',
    title: 'Web Basics Test',
    passPercentage: 70,
  });

  const q1 = QuizQuestionEntity.create({
    testUuid: test.uuid,
    prompt: 'What is HTML?',
    options: ['HyperText Markup Language', 'High Tech Machine Language'],
    correctOption: 'HyperText Markup Language',
    points: 10,
  });

  const q2 = QuizQuestionEntity.create({
    testUuid: test.uuid,
    prompt: 'Is CSS for styling?',
    options: ['Yes', 'No'],
    correctOption: 'Yes',
    points: 10,
  });

  // Attempt 1: 100% (20/20) => Passed
  const attemptPass = QuizAttemptEntity.evaluate({
    testUuid: test.uuid,
    studentEmail: 'student@neot.in',
    answers: {
      [q1.uuid]: 'HyperText Markup Language',
      [q2.uuid]: 'Yes',
    },
    questions: [q1, q2],
    passPercentage: test.passPercentage,
  });

  assert.equal(attemptPass.score, 20);
  assert.equal(attemptPass.totalPoints, 20);
  assert.equal(attemptPass.percentage, 100);
  assert.equal(attemptPass.passed, true);

  // Attempt 2: 50% (10/20) => Failed (< 70%)
  const attemptFail = QuizAttemptEntity.evaluate({
    testUuid: test.uuid,
    studentEmail: 'student@neot.in',
    answers: {
      [q1.uuid]: 'HyperText Markup Language',
      [q2.uuid]: 'No',
    },
    questions: [q1, q2],
    passPercentage: test.passPercentage,
  });

  assert.equal(attemptFail.score, 10);
  assert.equal(attemptFail.percentage, 50);
  assert.equal(attemptFail.passed, false);
});

test('SqliteNeotRepository boots in-memory and seeds properly', async () => {
  const repo = new SqliteNeotRepository(':memory:');
  repo.seedIfEmpty();

  const snapshot = await repo.snapshot();
  assert.ok(snapshot.courses.length >= 2, 'Should seed at least 2 courses');
  assert.ok(snapshot.lessons.length >= 2, 'Should seed at least 2 lessons');
  assert.ok(snapshot.tests.length >= 2, 'Should seed at least 2 tests');

  const course = snapshot.courses[0];
  const fetched = await repo.getCourse(course.uuid);
  assert.equal(fetched?.title, course.title);
});

test('NeotRouter dispatches snapshot, progress, and quiz submission', async () => {
  const repo = new SqliteNeotRepository(':memory:');
  repo.seedIfEmpty();

  const study = new StudyService(repo);
  const assess = new AssessmentService(repo);
  const mockCloud = {
    checkHealth: async () => ({ ok: true, message: 'Cloud reachable' }),
    fetchRemoteSnapshot: async () => ({ protocolVersion: 1, instanceId: 'remote-1', publishedAt: new Date().toISOString(), tables: {} }),
    publishLocalSnapshot: async () => ({ revision: 1, status: 'ok' }),
  };
  const sync = new NeotSyncService(repo, mockCloud);
  const router = new NeotRouter(study, assess, sync);

  const actor = { email: 'student1@neot.in', role: 'student' };

  // 1. Get snapshot
  const snapshotRes = await router.dispatch('GET', '/snapshot', null, actor);
  assert.equal(snapshotRes.status, 200);
  const snapshotData = snapshotRes.data;
  assert.ok(snapshotData.courses.length > 0);

  // 2. Mark lesson as completed
  const lesson = snapshotData.lessons[0];
  const progressRes = await router.dispatch('PUT', `/lessons/${lesson.uuid}/progress`, { status: 'completed' }, actor);
  assert.equal(progressRes.status, 200);
  assert.equal(progressRes.data.status, 'completed');

  // 3. Submit quiz attempt
  const test = snapshotData.tests[0];
  const questions = snapshotData.quizQuestions.filter(q => q.testUuid === test.uuid);
  const answers = {};
  if (questions[0]) {
    // For html test, first question correct is '<main>'
    answers[questions[0].uuid] = '<main>';
  }

  const attemptRes = await router.dispatch('POST', `/tests/${test.uuid}/attempts`, { answers }, actor);
  assert.equal(attemptRes.status, 200);
  assert.ok(typeof attemptRes.data.score === 'number');

  // 4. Sync status
  const syncRes = await router.dispatch('GET', '/sync/status', null, actor);
  assert.equal(syncRes.status, 200);
  assert.equal(syncRes.data.cloudUrl, 'https://neot.in');

  // 5. Sync health check
  const healthRes = await router.dispatch('POST', '/sync/health', null, actor);
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.data.ok, true);

  // 6. Assignment submission & review
  const assignCreateRes = await router.dispatch('POST', '/assignments', {
    lessonUuid: lesson.uuid,
    title: 'CSS Grid Portfolio Project',
    description: 'Build a responsive 3-column layout',
    maxPoints: 100,
  }, actor);
  assert.equal(assignCreateRes.status, 201);
  const assignmentUuid = assignCreateRes.data.uuid;

  const submitRes = await router.dispatch('POST', `/assignments/${assignmentUuid}/submissions`, {
    content: 'https://github.com/codexsun/css-grid-portfolio',
    attachmentUrl: 'https://codexsun.github.io/portfolio',
  }, actor);
  assert.equal(submitRes.status, 201);
  assert.equal(submitRes.data.status, 'submitted');

  const reviewRes = await router.dispatch('PUT', `/submissions/${submitRes.data.uuid}/review`, {
    score: 95,
    feedback: 'Excellent responsive grid implementation and semantic HTML.',
    reviewer: 'Senior Mentor',
  }, { email: 'admin@neot.in', role: 'admin' });
  assert.equal(reviewRes.status, 200);
  assert.equal(reviewRes.data.score, 95);
  assert.equal(reviewRes.data.status, 'reviewed');

  // 7. Attendance session & record
  const classItem = snapshotData.classes[0];
  const sessionRes = await router.dispatch('POST', `/classes/${classItem.uuid}/attendance/sessions`, {
    sessionDate: '2026-09-05',
    topic: 'Modern CSS Grid & Flexbox Lab',
    createdBy: 'Mentor Alex',
  }, actor);
  assert.equal(sessionRes.status, 201);
  const sessionUuid = sessionRes.data.uuid;

  const recordRes = await router.dispatch('POST', `/attendance/sessions/${sessionUuid}/records`, {
    records: [
      { studentEmail: actor.email, status: 'present', notes: 'Active participation' },
      { studentEmail: 'absent@neot.in', status: 'absent', notes: 'Prior sick notice' },
    ],
  }, actor);
  assert.equal(recordRes.status, 200);
  assert.equal(recordRes.data.length, 2);

  // 8. Claim verifiable certificate
  const course = snapshotData.courses[0];
  const certRes = await router.dispatch('POST', `/courses/${course.uuid}/certificates/claim`, {
    gradePercentage: 94,
  }, actor);
  assert.equal(certRes.status, 201);
  assert.ok(certRes.data.certificateCode.startsWith('NEOT-'));
  assert.ok(certRes.data.verificationHash.length === 64);

  // 9. Verify certificate by code
  const verifyRes = await router.dispatch('GET', `/certificates/${certRes.data.certificateCode}`, null, actor);
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.data.verificationHash, certRes.data.verificationHash);
});
