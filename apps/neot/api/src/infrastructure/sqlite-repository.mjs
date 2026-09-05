import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { defaultCourses } from './seeds.mjs';

export class SqliteNeotRepository {
  constructor(dbPath = ':memory:') {
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS neot_migrations (name TEXT PRIMARY KEY);');
    this.runMigrations();
    this.instanceId = randomUUID();
    this.initSyncState();
  }

  runMigrations() {
    const migrationDir = new URL('../../migrations/', import.meta.url);
    try {
      const files = readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const row = this.db.prepare('SELECT name FROM neot_migrations WHERE name = ?').get(file);
        if (row) continue;
        const sql = readFileSync(new URL(file, migrationDir), 'utf8');
        this.transaction(() => {
          this.db.exec(sql);
          this.db.prepare('INSERT INTO neot_migrations VALUES (?)').run(file);
        });
      }
    } catch {
      // Ignore if directory cannot be read
    }
  }

  initSyncState() {
    const row = this.db.prepare('SELECT * FROM neot_sync_state LIMIT 1').get();
    if (!row) {
      this.db.prepare(`
        INSERT INTO neot_sync_state (instance_id, cloud_url, role, status)
        VALUES (?, 'https://neot.in', 'local', 'ready')
      `).run(this.instanceId);
    }
  }

  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = action();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  seedIfEmpty() {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM neot_courses').get().c;
    if (count > 0) return;

    this.transaction(() => {
      for (const c of defaultCourses) {
        this.saveCourseSync({
          id: 0,
          uuid: c.uuid,
          code: c.code,
          title: c.title,
          description: c.description,
          author: c.author,
          coverImage: c.coverImage,
          theme: c.theme,
          position: c.position,
          status: c.status,
          syncId: randomUUID(),
          syncStatus: 'local',
          syncVersion: 1,
          syncUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        for (const s of c.subjects) {
          this.saveSubjectSync({
            id: 0,
            uuid: s.uuid,
            courseUuid: c.uuid,
            title: s.title,
            description: s.description,
            position: s.position,
            syncId: randomUUID(),
            syncStatus: 'local',
            syncVersion: 1,
            syncUpdatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          for (const l of s.lessons) {
            this.saveLessonSync({
              id: 0,
              uuid: l.uuid,
              subjectUuid: s.uuid,
              title: l.title,
              content: l.content,
              author: l.author,
              position: l.position,
              status: 'published',
              syncId: randomUUID(),
              syncStatus: 'local',
              syncVersion: 1,
              syncUpdatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            for (const q of l.questions ?? []) {
              this.saveQuestionSync({
                id: 0,
                uuid: q.uuid,
                lessonUuid: l.uuid,
                askedBy: q.askedBy,
                questionText: q.questionText,
                status: 'answered',
                syncId: randomUUID(),
                syncStatus: 'local',
                syncVersion: 1,
                syncUpdatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });

              for (const a of q.answers ?? []) {
                this.saveAnswerSync({
                  id: 0,
                  uuid: a.uuid,
                  questionUuid: q.uuid,
                  answeredBy: a.answeredBy,
                  answerText: a.answerText,
                  accepted: a.accepted,
                  syncId: randomUUID(),
                  syncStatus: 'local',
                  syncVersion: 1,
                  syncUpdatedAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
        }

        for (const t of c.tests ?? []) {
          this.saveTestSync({
            id: 0,
            uuid: t.uuid,
            courseUuid: c.uuid,
            lessonUuid: null,
            title: t.title,
            instructions: t.instructions,
            passPercentage: t.passPercentage,
            status: 'active',
            syncId: randomUUID(),
            syncStatus: 'local',
            syncVersion: 1,
            syncUpdatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          for (const q of t.questions ?? []) {
            this.saveQuizQuestionSync({
              id: 0,
              uuid: q.uuid,
              testUuid: t.uuid,
              prompt: q.prompt,
              options: q.options,
              correctOption: q.correctOption,
              points: q.points,
              position: q.position,
              syncId: randomUUID(),
              syncStatus: 'local',
              syncVersion: 1,
              syncUpdatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        for (const cls of c.classes ?? []) {
          this.saveClassSync({
            id: 0,
            uuid: cls.uuid,
            courseUuid: c.uuid,
            title: cls.title,
            masterEmail: cls.masterEmail,
            scheduleText: cls.scheduleText,
            status: cls.status,
            syncId: randomUUID(),
            syncStatus: 'local',
            syncVersion: 1,
            syncUpdatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Seed Assignment
      this.db.prepare(`
        INSERT OR IGNORE INTO neot_assignments (uuid, lesson_uuid, title, description, max_points, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
        VALUES ('as-html-semantic', 'lesson_html_intro_001', 'Interactive Semantic Landing Page', 'Design an accessible semantic landing page using header, nav, main, sections, article, and footer. Test with keyboard navigation and submit code.', 100, ?, 'local', 1, ?, ?, ?)
      `).run(randomUUID(), new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

      // Seed Attendance Session & Record
      this.db.prepare(`
        INSERT OR IGNORE INTO neot_attendance_sessions (uuid, class_uuid, session_date, topic, created_by, sync_id, sync_status, sync_version, sync_updated_at, created_at)
        VALUES ('att-session-1', 'class_web_morning_001', '2026-09-01', 'Cohort Kickoff & Modern Web Architecture', 'Master Alex', ?, 'local', 1, ?, ?)
      `).run(randomUUID(), new Date().toISOString(), new Date().toISOString());

      this.db.prepare(`
        INSERT OR IGNORE INTO neot_attendance_records (uuid, session_uuid, student_email, status, notes, sync_id, sync_status, sync_version, sync_updated_at, updated_at)
        VALUES ('att-rec-1', 'att-session-1', 'student@neot.in', 'present', 'Active live participation and completed kick-off tasks.', ?, 'local', 1, ?, ?)
      `).run(randomUUID(), new Date().toISOString(), new Date().toISOString());

      // Seed Sample Certificate
      this.db.prepare(`
        INSERT OR IGNORE INTO neot_certificates (uuid, course_uuid, student_email, certificate_code, grade_percentage, issued_at, verification_hash)
        VALUES ('cert-sample-1', 'course_html_foundations_001', 'student@neot.in', 'NEOT-HTML-2026-8941', 96, ?, 'a8f93e1b7c4d5e6f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f')
      `).run(new Date().toISOString());
    });
  }

  // Snapshot
  async snapshot(studentEmail = 'student@neot.in') {
    const courses = this.db.prepare('SELECT * FROM neot_courses ORDER BY position ASC, title ASC').all().map(this.mapCourse);
    const subjects = this.db.prepare('SELECT * FROM neot_subjects ORDER BY position ASC').all().map(this.mapSubject);
    const lessons = this.db.prepare('SELECT * FROM neot_lessons ORDER BY position ASC').all().map(this.mapLesson);
    const classes = this.db.prepare('SELECT * FROM neot_classes ORDER BY created_at DESC').all().map(this.mapClass);
    const enrollments = this.db.prepare('SELECT * FROM neot_enrollments ORDER BY created_at DESC').all().map(this.mapEnrollment);
    const questions = this.db.prepare('SELECT * FROM neot_questions ORDER BY created_at DESC').all().map(this.mapQuestion);
    const answers = this.db.prepare('SELECT * FROM neot_answers ORDER BY created_at ASC').all().map(this.mapAnswer);
    const tests = this.db.prepare('SELECT * FROM neot_tests ORDER BY created_at DESC').all().map(this.mapTest);
    const quizQuestions = this.db.prepare('SELECT * FROM neot_quiz_questions ORDER BY position ASC').all().map(q => {
      const mapped = this.mapQuizQuestion(q);
      const { correctOption, ...publicQuestion } = mapped;
      return publicQuestion;
    });
    const attempts = this.db.prepare('SELECT * FROM neot_quiz_attempts ORDER BY completed_at DESC').all().map(this.mapAttempt);
    const progress = this.db.prepare('SELECT * FROM neot_lesson_progress WHERE student_email = ? ORDER BY last_opened_at DESC').all(studentEmail).map(this.mapProgress);
    const discussions = this.db.prepare('SELECT * FROM neot_discussions ORDER BY created_at ASC').all().map(this.mapDiscussion);
    const assignments = this.db.prepare('SELECT * FROM neot_assignments').all().map(this.mapAssignment);
    const submissions = this.db.prepare('SELECT * FROM neot_assignment_submissions').all().map(this.mapSubmission);
    const attendanceSessions = this.db.prepare('SELECT * FROM neot_attendance_sessions ORDER BY session_date DESC').all().map(this.mapAttendanceSession);
    const attendanceRecords = this.db.prepare('SELECT * FROM neot_attendance_records').all().map(this.mapAttendanceRecord);
    const certificates = this.db.prepare('SELECT * FROM neot_certificates WHERE student_email = ?').all(studentEmail).map(this.mapCertificate);
    const performance = await this.getPerformance(studentEmail);

    return {
      courses,
      subjects,
      lessons,
      classes,
      enrollments,
      questions,
      answers,
      tests,
      quizQuestions,
      attempts,
      progress,
      discussions,
      assignments,
      submissions,
      attendanceSessions,
      attendanceRecords,
      certificates,
      performance,
    };
  }

  // Courses
  async getCourses() {
    return this.db.prepare('SELECT * FROM neot_courses ORDER BY position ASC, title ASC').all().map(this.mapCourse);
  }

  async getCourse(uuid) {
    const row = this.db.prepare('SELECT * FROM neot_courses WHERE uuid = ?').get(uuid);
    return row ? this.mapCourse(row) : null;
  }

  async saveCourse(course) {
    return this.saveCourseSync(course);
  }

  saveCourseSync(course) {
    this.db.prepare(`
      INSERT INTO neot_courses (uuid, code, title, description, author, cover_image, theme, position, status, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        code = excluded.code,
        title = excluded.title,
        description = excluded.description,
        author = excluded.author,
        cover_image = excluded.cover_image,
        theme = excluded.theme,
        position = excluded.position,
        status = excluded.status,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      course.uuid,
      course.code,
      course.title,
      course.description,
      course.author,
      course.coverImage,
      course.theme,
      course.position,
      course.status,
      course.syncId,
      course.syncStatus,
      course.syncVersion,
      course.syncUpdatedAt,
      course.createdAt,
      course.updatedAt
    );
    return this.getCourse(course.uuid);
  }

  // Subjects
  async getSubjects(courseUuid) {
    const rows = courseUuid
      ? this.db.prepare('SELECT * FROM neot_subjects WHERE course_uuid = ? ORDER BY position ASC').all(courseUuid)
      : this.db.prepare('SELECT * FROM neot_subjects ORDER BY position ASC').all();
    return rows.map(this.mapSubject);
  }

  async saveSubject(subject) {
    return this.saveSubjectSync(subject);
  }

  saveSubjectSync(subject) {
    this.db.prepare(`
      INSERT INTO neot_subjects (uuid, course_uuid, title, description, position, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        position = excluded.position,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      subject.uuid,
      subject.courseUuid,
      subject.title,
      subject.description,
      subject.position,
      subject.syncId,
      subject.syncStatus,
      subject.syncVersion,
      subject.syncUpdatedAt,
      subject.createdAt,
      subject.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_subjects WHERE uuid = ?').get(subject.uuid);
    return this.mapSubject(row);
  }

  // Lessons
  async getLessons(subjectUuid) {
    const rows = subjectUuid
      ? this.db.prepare('SELECT * FROM neot_lessons WHERE subject_uuid = ? ORDER BY position ASC').all(subjectUuid)
      : this.db.prepare('SELECT * FROM neot_lessons ORDER BY position ASC').all();
    return rows.map(this.mapLesson);
  }

  async getLesson(uuid) {
    const row = this.db.prepare('SELECT * FROM neot_lessons WHERE uuid = ?').get(uuid);
    return row ? this.mapLesson(row) : null;
  }

  async saveLesson(lesson) {
    return this.saveLessonSync(lesson);
  }

  saveLessonSync(lesson) {
    this.db.prepare(`
      INSERT INTO neot_lessons (uuid, subject_uuid, title, content, author, position, status, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        author = excluded.author,
        position = excluded.position,
        status = excluded.status,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      lesson.uuid,
      lesson.subjectUuid,
      lesson.title,
      lesson.content,
      lesson.author,
      lesson.position,
      lesson.status,
      lesson.syncId,
      lesson.syncStatus,
      lesson.syncVersion,
      lesson.syncUpdatedAt,
      lesson.createdAt,
      lesson.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_lessons WHERE uuid = ?').get(lesson.uuid);
    return this.mapLesson(row);
  }

  // Progress
  async getProgress(lessonUuid, studentEmail) {
    const row = this.db.prepare('SELECT * FROM neot_lesson_progress WHERE lesson_uuid = ? AND student_email = ?').get(lessonUuid, studentEmail);
    return row ? this.mapProgress(row) : null;
  }

  async saveProgress(progress) {
    this.db.prepare(`
      INSERT INTO neot_lesson_progress (uuid, lesson_uuid, student_email, status, sync_id, sync_status, sync_version, sync_updated_at, last_opened_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lesson_uuid, student_email) DO UPDATE SET
        status = excluded.status,
        last_opened_at = excluded.last_opened_at,
        completed_at = excluded.completed_at,
        sync_version = sync_version + 1,
        sync_updated_at = excluded.sync_updated_at
    `).run(
      progress.uuid,
      progress.lessonUuid,
      progress.studentEmail,
      progress.status,
      randomUUID(),
      'local',
      1,
      progress.lastOpenedAt,
      progress.lastOpenedAt,
      progress.completedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_lesson_progress WHERE lesson_uuid = ? AND student_email = ?').get(progress.lessonUuid, progress.studentEmail);
    return this.mapProgress(row);
  }

  // Classes & Enrollments
  async getClasses(courseUuid) {
    const rows = courseUuid
      ? this.db.prepare('SELECT * FROM neot_classes WHERE course_uuid = ? ORDER BY created_at DESC').all(courseUuid)
      : this.db.prepare('SELECT * FROM neot_classes ORDER BY created_at DESC').all();
    return rows.map(this.mapClass);
  }

  async saveClass(classSchedule) {
    return this.saveClassSync(classSchedule);
  }

  saveClassSync(classSchedule) {
    this.db.prepare(`
      INSERT INTO neot_classes (uuid, course_uuid, title, master_email, schedule_text, status, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        title = excluded.title,
        master_email = excluded.master_email,
        schedule_text = excluded.schedule_text,
        status = excluded.status,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      classSchedule.uuid,
      classSchedule.courseUuid,
      classSchedule.title,
      classSchedule.masterEmail,
      classSchedule.scheduleText,
      classSchedule.status,
      classSchedule.syncId,
      classSchedule.syncStatus,
      classSchedule.syncVersion,
      classSchedule.syncUpdatedAt,
      classSchedule.createdAt,
      classSchedule.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_classes WHERE uuid = ?').get(classSchedule.uuid);
    return this.mapClass(row);
  }

  async getEnrollments(courseUuid) {
    const rows = courseUuid
      ? this.db.prepare('SELECT * FROM neot_enrollments WHERE course_uuid = ? ORDER BY created_at DESC').all(courseUuid)
      : this.db.prepare('SELECT * FROM neot_enrollments ORDER BY created_at DESC').all();
    return rows.map(this.mapEnrollment);
  }

  async saveEnrollment(enrollment) {
    this.db.prepare(`
      INSERT INTO neot_enrollments (uuid, course_uuid, class_uuid, member_email, member_name, role, status, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        class_uuid = excluded.class_uuid,
        member_name = excluded.member_name,
        role = excluded.role,
        status = excluded.status,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      enrollment.uuid,
      enrollment.courseUuid,
      enrollment.classUuid,
      enrollment.memberEmail,
      enrollment.memberName,
      enrollment.role,
      enrollment.status,
      enrollment.syncId,
      enrollment.syncStatus,
      enrollment.syncVersion,
      enrollment.syncUpdatedAt,
      enrollment.createdAt,
      enrollment.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_enrollments WHERE uuid = ?').get(enrollment.uuid);
    return this.mapEnrollment(row);
  }

  // Q&A
  async getQuestions(lessonUuid) {
    const rows = lessonUuid
      ? this.db.prepare('SELECT * FROM neot_questions WHERE lesson_uuid = ? ORDER BY created_at DESC').all(lessonUuid)
      : this.db.prepare('SELECT * FROM neot_questions ORDER BY created_at DESC').all();
    return rows.map(this.mapQuestion);
  }

  async saveQuestion(question) {
    return this.saveQuestionSync(question);
  }

  saveQuestionSync(question) {
    this.db.prepare(`
      INSERT INTO neot_questions (uuid, lesson_uuid, asked_by, question_text, status, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        question_text = excluded.question_text,
        status = excluded.status,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      question.uuid,
      question.lessonUuid,
      question.askedBy,
      question.questionText,
      question.status,
      question.syncId,
      question.syncStatus,
      question.syncVersion,
      question.syncUpdatedAt,
      question.createdAt,
      question.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_questions WHERE uuid = ?').get(question.uuid);
    return this.mapQuestion(row);
  }

  async getAnswers(questionUuid) {
    const rows = this.db.prepare('SELECT * FROM neot_answers WHERE question_uuid = ? ORDER BY created_at ASC').all(questionUuid);
    return rows.map(this.mapAnswer);
  }

  async saveAnswer(answer) {
    return this.saveAnswerSync(answer);
  }

  saveAnswerSync(answer) {
    this.db.prepare(`
      INSERT INTO neot_answers (uuid, question_uuid, answered_by, answer_text, accepted, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        answer_text = excluded.answer_text,
        accepted = excluded.accepted,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      answer.uuid,
      answer.questionUuid,
      answer.answeredBy,
      answer.answerText,
      answer.accepted ? 1 : 0,
      answer.syncId,
      answer.syncStatus,
      answer.syncVersion,
      answer.syncUpdatedAt,
      answer.createdAt,
      answer.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_answers WHERE uuid = ?').get(answer.uuid);
    return this.mapAnswer(row);
  }

  // Discussions
  async getDiscussions(lessonUuid) {
    const rows = this.db.prepare('SELECT * FROM neot_discussions WHERE lesson_uuid = ? ORDER BY created_at ASC').all(lessonUuid);
    return rows.map(this.mapDiscussion);
  }

  async saveDiscussion(post) {
    this.db.prepare(`
      INSERT INTO neot_discussions (uuid, lesson_uuid, parent_uuid, author, body, sync_id, sync_status, sync_version, sync_updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      post.uuid,
      post.lessonUuid,
      post.parentUuid,
      post.author,
      post.body,
      randomUUID(),
      'local',
      1,
      post.createdAt,
      post.createdAt
    );
    const row = this.db.prepare('SELECT * FROM neot_discussions WHERE uuid = ?').get(post.uuid);
    return this.mapDiscussion(row);
  }

  // Tests & Quizzes
  async getTests(courseUuid) {
    const rows = courseUuid
      ? this.db.prepare('SELECT * FROM neot_tests WHERE course_uuid = ? ORDER BY created_at DESC').all(courseUuid)
      : this.db.prepare('SELECT * FROM neot_tests ORDER BY created_at DESC').all();
    return rows.map(this.mapTest);
  }

  async getTest(uuid) {
    const row = this.db.prepare('SELECT * FROM neot_tests WHERE uuid = ?').get(uuid);
    return row ? this.mapTest(row) : null;
  }

  async saveTest(test) {
    return this.saveTestSync(test);
  }

  saveTestSync(test) {
    this.db.prepare(`
      INSERT INTO neot_tests (uuid, course_uuid, lesson_uuid, title, instructions, pass_percentage, status, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        title = excluded.title,
        instructions = excluded.instructions,
        pass_percentage = excluded.pass_percentage,
        status = excluded.status,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      test.uuid,
      test.courseUuid,
      test.lessonUuid,
      test.title,
      test.instructions,
      test.passPercentage,
      test.status,
      test.syncId,
      test.syncStatus,
      test.syncVersion,
      test.syncUpdatedAt,
      test.createdAt,
      test.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_tests WHERE uuid = ?').get(test.uuid);
    return this.mapTest(row);
  }

  async getQuizQuestions(testUuid) {
    const rows = this.db.prepare('SELECT * FROM neot_quiz_questions WHERE test_uuid = ? ORDER BY position ASC').all(testUuid);
    return rows.map(this.mapQuizQuestion);
  }

  async saveQuizQuestion(question) {
    return this.saveQuizQuestionSync(question);
  }

  saveQuizQuestionSync(question) {
    this.db.prepare(`
      INSERT INTO neot_quiz_questions (uuid, test_uuid, prompt, options_json, correct_option, points, position, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        prompt = excluded.prompt,
        options_json = excluded.options_json,
        correct_option = excluded.correct_option,
        points = excluded.points,
        position = excluded.position,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      question.uuid,
      question.testUuid,
      question.prompt,
      JSON.stringify(question.options),
      question.correctOption,
      question.points,
      question.position,
      question.syncId,
      question.syncStatus,
      question.syncVersion,
      question.syncUpdatedAt,
      question.createdAt,
      question.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_quiz_questions WHERE uuid = ?').get(question.uuid);
    return this.mapQuizQuestion(row);
  }

  async saveAttempt(attempt) {
    this.db.prepare(`
      INSERT INTO neot_quiz_attempts (uuid, test_uuid, student_email, answers_json, score, total_points, percentage, passed, sync_id, sync_status, sync_version, sync_updated_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      attempt.uuid,
      attempt.testUuid,
      attempt.studentEmail,
      JSON.stringify(attempt.answers),
      attempt.score,
      attempt.totalPoints,
      attempt.percentage,
      attempt.passed ? 1 : 0,
      randomUUID(),
      'local',
      1,
      attempt.completedAt,
      attempt.completedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_quiz_attempts WHERE uuid = ?').get(attempt.uuid);
    return this.mapAttempt(row);
  }

  async getAttempts(testUuid, studentEmail) {
    let query = 'SELECT * FROM neot_quiz_attempts WHERE 1=1';
    const params = [];
    if (testUuid) { query += ' AND test_uuid = ?'; params.push(testUuid); }
    if (studentEmail) { query += ' AND student_email = ?'; params.push(studentEmail); }
    query += ' ORDER BY completed_at DESC';
    const rows = this.db.prepare(query).all(...params);
    return rows.map(this.mapAttempt);
  }

  async getPerformance(studentEmail) {
    let query = `
      SELECT student_email,
             COUNT(*) as attempts,
             ROUND(AVG(percentage), 1) as avg_pct,
             MAX(percentage) as best_pct
      FROM neot_quiz_attempts
    `;
    const params = [];
    if (studentEmail) {
      query += ' WHERE student_email = ?';
      params.push(studentEmail);
    }
    query += ' GROUP BY student_email';
    const rows = this.db.prepare(query).all(...params);
    return rows.map(r => ({
      studentEmail: r.student_email,
      attempts: r.attempts,
      averagePercentage: r.avg_pct ?? 0,
      bestPercentage: r.best_pct ?? 0,
    }));
  }

  // Sync
  async getSyncStatus() {
    const row = this.db.prepare('SELECT * FROM neot_sync_state LIMIT 1').get() ?? {};
    const pendingChanges = this.db.prepare("SELECT COUNT(*) as c FROM neot_courses WHERE sync_status = 'local'").get().c;
    return {
      instanceId: row.instance_id ?? this.instanceId,
      cloudUrl: row.cloud_url ?? 'https://neot.in',
      role: row.role ?? 'local',
      status: row.status ?? 'ready',
      lastPulledAt: row.last_pulled_at ?? null,
      lastPublishedAt: row.last_published_at ?? null,
      lastVerifiedAt: row.last_verified_at ?? null,
      pendingChangesCount: pendingChanges,
      remoteRevision: row.remote_revision ?? 0,
      lastError: row.last_error ?? null,
    };
  }

  async updateSyncStatus(status) {
    const updates = [];
    const params = [];
    if (status.cloudUrl !== undefined) { updates.push('cloud_url = ?'); params.push(status.cloudUrl); }
    if (status.role !== undefined) { updates.push('role = ?'); params.push(status.role); }
    if (status.status !== undefined) { updates.push('status = ?'); params.push(status.status); }
    if (status.lastPulledAt !== undefined) { updates.push('last_pulled_at = ?'); params.push(status.lastPulledAt); }
    if (status.lastPublishedAt !== undefined) { updates.push('last_published_at = ?'); params.push(status.lastPublishedAt); }
    if (status.lastVerifiedAt !== undefined) { updates.push('last_verified_at = ?'); params.push(status.lastVerifiedAt); }
    if (status.remoteRevision !== undefined) { updates.push('remote_revision = ?'); params.push(status.remoteRevision); }
    if (status.lastError !== undefined) { updates.push('last_error = ?'); params.push(status.lastError); }

    if (updates.length > 0) {
      this.db.prepare(`UPDATE neot_sync_state SET ${updates.join(', ')} WHERE id = 1`).run(...params);
    }
  }

  async exportSnapshot() {
    const tables = {
      courses: this.db.prepare('SELECT * FROM neot_courses').all(),
      subjects: this.db.prepare('SELECT * FROM neot_subjects').all(),
      lessons: this.db.prepare('SELECT * FROM neot_lessons').all(),
      classes: this.db.prepare('SELECT * FROM neot_classes').all(),
      questions: this.db.prepare('SELECT * FROM neot_questions').all(),
      answers: this.db.prepare('SELECT * FROM neot_answers').all(),
      tests: this.db.prepare('SELECT * FROM neot_tests').all(),
      quizQuestions: this.db.prepare('SELECT * FROM neot_quiz_questions').all(),
    };

    return {
      protocolVersion: 1,
      instanceId: this.instanceId,
      publishedAt: new Date().toISOString(),
      tables,
    };
  }

  async importSnapshot(snapshot) {
    let count = 0;
    this.transaction(() => {
      for (const row of snapshot.tables?.courses ?? []) {
        const course = this.mapCourse(row);
        course.syncStatus = 'synchronized';
        this.saveCourseSync(course);
        count++;
      }
      for (const row of snapshot.tables?.subjects ?? []) {
        const subject = this.mapSubject(row);
        subject.syncStatus = 'synchronized';
        this.saveSubjectSync(subject);
        count++;
      }
      for (const row of snapshot.tables?.lessons ?? []) {
        const lesson = this.mapLesson(row);
        lesson.syncStatus = 'synchronized';
        this.saveLessonSync(lesson);
        count++;
      }
      for (const row of snapshot.tables?.classes ?? []) {
        const classSchedule = this.mapClass(row);
        classSchedule.syncStatus = 'synchronized';
        this.saveClassSync(classSchedule);
        count++;
      }
      for (const row of snapshot.tables?.questions ?? []) {
        const question = this.mapQuestion(row);
        question.syncStatus = 'synchronized';
        this.saveQuestionSync(question);
        count++;
      }
      for (const row of snapshot.tables?.answers ?? []) {
        const answer = this.mapAnswer(row);
        answer.syncStatus = 'synchronized';
        this.saveAnswerSync(answer);
        count++;
      }
      for (const row of snapshot.tables?.tests ?? []) {
        const test = this.mapTest(row);
        test.syncStatus = 'synchronized';
        this.saveTestSync(test);
        count++;
      }
      for (const row of snapshot.tables?.quizQuestions ?? []) {
        const q = this.mapQuizQuestion(row);
        q.syncStatus = 'synchronized';
        this.saveQuizQuestionSync(q);
        count++;
      }
    });

    return { recordsImported: count };
  }

  // Row mapping helpers
  mapCourse(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      code: row.code,
      title: row.title,
      description: row.description ?? '',
      author: row.author ?? '',
      coverImage: row.cover_image ?? '',
      theme: row.theme ?? 'forest',
      position: row.position ?? 0,
      status: row.status ?? 'active',
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapSubject(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      courseUuid: row.course_uuid,
      title: row.title,
      description: row.description ?? '',
      position: row.position ?? 0,
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapLesson(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      subjectUuid: row.subject_uuid,
      title: row.title,
      content: row.content ?? '',
      author: row.author ?? '',
      position: row.position ?? 0,
      status: row.status ?? 'published',
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapClass(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      courseUuid: row.course_uuid,
      title: row.title,
      masterEmail: row.master_email ?? '',
      scheduleText: row.schedule_text ?? '',
      status: row.status ?? 'scheduled',
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapEnrollment(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      courseUuid: row.course_uuid,
      classUuid: row.class_uuid ?? null,
      memberEmail: row.member_email,
      memberName: row.member_name ?? '',
      role: row.role ?? 'student',
      status: row.status ?? 'active',
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapQuestion(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      lessonUuid: row.lesson_uuid,
      askedBy: row.asked_by,
      questionText: row.question_text,
      status: row.status ?? 'open',
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapAnswer(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      questionUuid: row.question_uuid,
      answeredBy: row.answered_by,
      answerText: row.answer_text,
      accepted: Boolean(row.accepted),
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapTest(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      courseUuid: row.course_uuid,
      lessonUuid: row.lesson_uuid ?? null,
      title: row.title,
      instructions: row.instructions ?? '',
      passPercentage: row.pass_percentage ?? 60,
      status: row.status ?? 'active',
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapQuizQuestion(row) {
    let options = [];
    try {
      options = typeof row.options_json === 'string' ? JSON.parse(row.options_json) : (row.options ?? []);
    } catch {
      options = [];
    }
    return {
      id: row.id,
      uuid: row.uuid,
      testUuid: row.test_uuid,
      prompt: row.prompt,
      options,
      correctOption: row.correct_option ?? '',
      points: row.points ?? 1,
      position: row.position ?? 0,
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapAttempt(row) {
    let answers = {};
    try {
      answers = typeof row.answers_json === 'string' ? JSON.parse(row.answers_json) : (row.answers ?? {});
    } catch {
      answers = {};
    }
    return {
      id: row.id,
      uuid: row.uuid,
      testUuid: row.test_uuid,
      studentEmail: row.student_email,
      answers,
      score: row.score ?? 0,
      totalPoints: row.total_points ?? 0,
      percentage: row.percentage ?? 0,
      passed: Boolean(row.passed),
      completedAt: row.completed_at ?? '',
    };
  }

  mapProgress(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      lessonUuid: row.lesson_uuid,
      studentEmail: row.student_email,
      status: row.status ?? 'viewed',
      lastOpenedAt: row.last_opened_at ?? '',
      completedAt: row.completed_at ?? null,
    };
  }

  mapDiscussion(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      lessonUuid: row.lesson_uuid,
      parentUuid: row.parent_uuid ?? null,
      author: row.author,
      body: row.body,
      createdAt: row.created_at ?? '',
    };
  }

  // Assignments & Submissions
  async getAssignments(lessonUuid) {
    const rows = lessonUuid
      ? this.db.prepare('SELECT * FROM neot_assignments WHERE lesson_uuid = ?').all(lessonUuid)
      : this.db.prepare('SELECT * FROM neot_assignments').all();
    return rows.map(this.mapAssignment);
  }

  async getAssignment(uuid) {
    const row = this.db.prepare('SELECT * FROM neot_assignments WHERE uuid = ?').get(uuid);
    return row ? this.mapAssignment(row) : null;
  }

  async saveAssignment(assignment) {
    this.db.prepare(`
      INSERT INTO neot_assignments (uuid, lesson_uuid, title, description, max_points, sync_id, sync_status, sync_version, sync_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        max_points = excluded.max_points,
        sync_version = excluded.sync_version,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      assignment.uuid,
      assignment.lessonUuid,
      assignment.title,
      assignment.description,
      assignment.maxPoints,
      assignment.syncId,
      assignment.syncStatus,
      assignment.syncVersion,
      assignment.syncUpdatedAt,
      assignment.createdAt,
      assignment.updatedAt
    );
    const row = this.db.prepare('SELECT * FROM neot_assignments WHERE uuid = ?').get(assignment.uuid);
    return this.mapAssignment(row);
  }

  async getSubmissions(assignmentUuid) {
    const rows = assignmentUuid
      ? this.db.prepare('SELECT * FROM neot_assignment_submissions WHERE assignment_uuid = ?').all(assignmentUuid)
      : this.db.prepare('SELECT * FROM neot_assignment_submissions').all();
    return rows.map(this.mapSubmission);
  }

  async getSubmissionByUuid(uuid) {
    const row = this.db.prepare('SELECT * FROM neot_assignment_submissions WHERE uuid = ?').get(uuid);
    return row ? this.mapSubmission(row) : null;
  }

  async saveSubmission(submission) {
    this.db.prepare(`
      INSERT INTO neot_assignment_submissions (uuid, assignment_uuid, student_email, content, attachment_url, status, score, feedback, reviewed_by, sync_id, sync_status, sync_version, sync_updated_at, submitted_at, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(assignment_uuid, student_email) DO UPDATE SET
        content = excluded.content,
        attachment_url = excluded.attachment_url,
        status = excluded.status,
        score = excluded.score,
        feedback = excluded.feedback,
        reviewed_by = excluded.reviewed_by,
        sync_version = sync_version + 1,
        sync_updated_at = excluded.sync_updated_at,
        reviewed_at = excluded.reviewed_at
    `).run(
      submission.uuid,
      submission.assignmentUuid,
      submission.studentEmail,
      submission.content ?? '',
      submission.attachmentUrl ?? '',
      submission.status ?? 'submitted',
      submission.score ?? null,
      submission.feedback ?? null,
      submission.reviewedBy ?? null,
      submission.syncId ?? randomUUID(),
      submission.syncStatus ?? 'local',
      submission.syncVersion ?? 1,
      submission.syncUpdatedAt ?? new Date().toISOString(),
      submission.submittedAt ?? new Date().toISOString(),
      submission.reviewedAt ?? null
    );
    const row = this.db.prepare('SELECT * FROM neot_assignment_submissions WHERE assignment_uuid = ? AND student_email = ?').get(submission.assignmentUuid, submission.studentEmail);
    return this.mapSubmission(row);
  }

  // Attendance Sessions & Records
  async createAttendanceSession(session) {
    this.db.prepare(`
      INSERT INTO neot_attendance_sessions (uuid, class_uuid, session_date, topic, created_by, sync_id, sync_status, sync_version, sync_updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.uuid,
      session.classUuid,
      session.sessionDate,
      session.topic ?? '',
      session.createdBy ?? '',
      session.syncId ?? randomUUID(),
      session.syncStatus ?? 'local',
      session.syncVersion ?? 1,
      session.syncUpdatedAt ?? new Date().toISOString(),
      session.createdAt ?? new Date().toISOString()
    );
    const row = this.db.prepare('SELECT * FROM neot_attendance_sessions WHERE uuid = ?').get(session.uuid);
    return this.mapAttendanceSession(row);
  }

  async getAttendanceSessions(classUuid) {
    const rows = classUuid
      ? this.db.prepare('SELECT * FROM neot_attendance_sessions WHERE class_uuid = ? ORDER BY session_date DESC').all(classUuid)
      : this.db.prepare('SELECT * FROM neot_attendance_sessions ORDER BY session_date DESC').all();
    return rows.map(this.mapAttendanceSession);
  }

  async getAttendanceRecords(sessionUuid) {
    const rows = sessionUuid
      ? this.db.prepare('SELECT * FROM neot_attendance_records WHERE session_uuid = ?').all(sessionUuid)
      : this.db.prepare('SELECT * FROM neot_attendance_records').all();
    return rows.map(this.mapAttendanceRecord);
  }

  async saveAttendanceRecord(record) {
    this.db.prepare(`
      INSERT INTO neot_attendance_records (uuid, session_uuid, student_email, status, notes, sync_id, sync_status, sync_version, sync_updated_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_uuid, student_email) DO UPDATE SET
        status = excluded.status,
        notes = excluded.notes,
        sync_version = sync_version + 1,
        sync_updated_at = excluded.sync_updated_at,
        updated_at = excluded.updated_at
    `).run(
      record.uuid,
      record.sessionUuid,
      record.studentEmail,
      record.status,
      record.notes ?? '',
      record.syncId ?? randomUUID(),
      record.syncStatus ?? 'local',
      record.syncVersion ?? 1,
      record.syncUpdatedAt ?? new Date().toISOString(),
      record.updatedAt ?? new Date().toISOString()
    );
    const row = this.db.prepare('SELECT * FROM neot_attendance_records WHERE session_uuid = ? AND student_email = ?').get(record.sessionUuid, record.studentEmail);
    return this.mapAttendanceRecord(row);
  }

  // Certificates
  async saveCertificate(cert) {
    this.db.prepare(`
      INSERT INTO neot_certificates (uuid, course_uuid, student_email, certificate_code, grade_percentage, issued_at, verification_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(course_uuid, student_email) DO UPDATE SET
        grade_percentage = excluded.grade_percentage,
        issued_at = excluded.issued_at,
        verification_hash = excluded.verification_hash
    `).run(
      cert.uuid,
      cert.courseUuid,
      cert.studentEmail,
      cert.certificateCode,
      cert.gradePercentage,
      cert.issuedAt,
      cert.verificationHash
    );
    const row = this.db.prepare('SELECT * FROM neot_certificates WHERE certificate_code = ?').get(cert.certificateCode);
    return this.mapCertificate(row);
  }

  async getCertificate(certificateCode) {
    const row = this.db.prepare('SELECT * FROM neot_certificates WHERE certificate_code = ?').get(certificateCode);
    return row ? this.mapCertificate(row) : null;
  }

  async getCertificates(studentEmail) {
    const rows = studentEmail
      ? this.db.prepare('SELECT * FROM neot_certificates WHERE student_email = ? ORDER BY issued_at DESC').all(studentEmail)
      : this.db.prepare('SELECT * FROM neot_certificates ORDER BY issued_at DESC').all();
    return rows.map(this.mapCertificate);
  }

  mapAssignment(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      lessonUuid: row.lesson_uuid,
      title: row.title,
      description: row.description ?? '',
      maxPoints: row.max_points ?? 100,
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapSubmission(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      assignmentUuid: row.assignment_uuid,
      studentEmail: row.student_email,
      content: row.content ?? '',
      attachmentUrl: row.attachment_url ?? '',
      status: row.status ?? 'submitted',
      score: row.score,
      feedback: row.feedback,
      reviewedBy: row.reviewed_by,
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      submittedAt: row.submitted_at ?? '',
      reviewedAt: row.reviewed_at ?? null,
    };
  }

  mapAttendanceSession(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      classUuid: row.class_uuid,
      sessionDate: row.session_date,
      topic: row.topic ?? '',
      createdBy: row.created_by ?? '',
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      createdAt: row.created_at ?? '',
    };
  }

  mapAttendanceRecord(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      sessionUuid: row.session_uuid,
      studentEmail: row.student_email,
      status: row.status ?? 'present',
      notes: row.notes ?? '',
      syncId: row.sync_id ?? '',
      syncStatus: row.sync_status ?? 'local',
      syncVersion: row.sync_version ?? 1,
      syncUpdatedAt: row.sync_updated_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  mapCertificate(row) {
    return {
      id: row.id,
      uuid: row.uuid,
      courseUuid: row.course_uuid,
      studentEmail: row.student_email,
      certificateCode: row.certificate_code,
      gradePercentage: row.grade_percentage ?? 100,
      issuedAt: row.issued_at ?? '',
      verificationHash: row.verification_hash ?? '',
    };
  }
}
