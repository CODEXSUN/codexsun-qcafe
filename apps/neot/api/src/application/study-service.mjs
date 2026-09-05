import { CourseAggregate, SubjectEntity } from '../domain/course.mjs';
import { LessonAggregate, LessonProgressEntity } from '../domain/lesson.mjs';
import { ClassScheduleAggregate, EnrollmentEntity } from '../domain/class-schedule.mjs';
import { AnswerEntity, DiscussionPostEntity, QuestionEntity } from '../domain/q-and-a.mjs';
import { AssignmentAggregate, AssignmentSubmissionEntity } from '../domain/assignment.mjs';
import { AttendanceSessionAggregate, AttendanceRecordEntity } from '../domain/attendance.mjs';
import { CertificateAggregate } from '../domain/certificate.mjs';
import { NotFoundError, ValidationError } from '../domain/errors.mjs';

export class StudyService {
  constructor(repository, eventBus) {
    this.repository = repository;
    this.eventBus = eventBus;
  }

  async getSnapshot(studentEmail) {
    return this.repository.snapshot(studentEmail);
  }

  // Courses
  async createCourse(input) {
    const course = CourseAggregate.create(input);
    const saved = await this.repository.saveCourse(course.snapshot());
    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: course.uuid,
        eventType: 'CourseCreated',
        occurredAt: new Date().toISOString(),
        payload: { courseUuid: course.uuid, title: course.title, code: course.code },
      });
    }
    return saved;
  }

  async updateCourse(uuid, input) {
    const existing = await this.repository.getCourse(uuid);
    if (!existing) throw new NotFoundError('Course', uuid);
    const aggregate = CourseAggregate.restore(existing);
    aggregate.update(input);
    return this.repository.saveCourse(aggregate.snapshot());
  }

  // Subjects
  async createSubject(input) {
    const subject = SubjectEntity.create(input);
    return this.repository.saveSubject(subject.snapshot());
  }

  // Lessons
  async createLesson(input) {
    const lesson = LessonAggregate.create(input);
    return this.repository.saveLesson(lesson.snapshot());
  }

  async updateLesson(uuid, input) {
    const existing = await this.repository.getLesson(uuid);
    if (!existing) throw new NotFoundError('Lesson', uuid);
    const aggregate = LessonAggregate.restore(existing);
    aggregate.update(input);
    return this.repository.saveLesson(aggregate.snapshot());
  }

  // Progress
  async recordProgress(lessonUuid, studentEmail, status) {
    const existing = await this.repository.getProgress(lessonUuid, studentEmail);
    const progress = LessonProgressEntity.createOrUpdate({
      lessonUuid,
      studentEmail,
      status,
      existing,
    });
    const saved = await this.repository.saveProgress(progress.snapshot());
    if (status === 'completed' && this.eventBus) {
      await this.eventBus.publish({
        eventId: saved.uuid,
        eventType: 'LessonCompleted',
        occurredAt: new Date().toISOString(),
        payload: { lessonUuid, studentEmail },
      });
    }
    return saved;
  }

  // Classes & Enrollments
  async createClass(input) {
    const classSchedule = ClassScheduleAggregate.create(input);
    return this.repository.saveClass(classSchedule.snapshot());
  }

  async enroll(input) {
    const enrollment = EnrollmentEntity.create(input);
    return this.repository.saveEnrollment(enrollment.snapshot());
  }

  // Q&A
  async askQuestion(lessonUuid, askedBy, questionText) {
    const question = QuestionEntity.create({ lessonUuid, askedBy, questionText });
    const saved = await this.repository.saveQuestion(question.snapshot());
    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: saved.uuid,
        eventType: 'QuestionAsked',
        occurredAt: new Date().toISOString(),
        payload: { questionUuid: saved.uuid, lessonUuid, askedBy },
      });
    }
    return saved;
  }

  async answerQuestion(questionUuid, answeredBy, answerText) {
    const answer = AnswerEntity.create({ questionUuid, answeredBy, answerText });
    return this.repository.saveAnswer(answer.snapshot());
  }

  async acceptAnswer(answerUuid, questionUuid) {
    const answers = await this.repository.getAnswers(questionUuid);
    const target = answers.find(a => a.uuid === answerUuid);
    if (!target) throw new NotFoundError('Answer', answerUuid);
    const answerEntity = AnswerEntity.restore(target);
    answerEntity.markAccepted();
    const saved = await this.repository.saveAnswer(answerEntity.snapshot());
    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: saved.uuid,
        eventType: 'AnswerAccepted',
        occurredAt: new Date().toISOString(),
        payload: { answerUuid, questionUuid, answeredBy: target.answeredBy },
      });
    }
    return saved;
  }

  // Discussions
  async getDiscussions(lessonUuid) {
    return this.repository.getDiscussions(lessonUuid);
  }

  async addDiscussion(lessonUuid, author, body, parentUuid) {
    const post = DiscussionPostEntity.create({ lessonUuid, author, body, parentUuid });
    return this.repository.saveDiscussion(post.snapshot());
  }

  // Assignments & Evidence
  async getAssignments(lessonUuid) {
    return this.repository.getAssignments(lessonUuid);
  }

  async getAssignment(uuid) {
    const assignment = await this.repository.getAssignment(uuid);
    if (!assignment) throw new NotFoundError('Assignment', uuid);
    return assignment;
  }

  async createAssignment(input) {
    const aggregate = AssignmentAggregate.create(input);
    const saved = await this.repository.saveAssignment(aggregate.snapshot());
    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: saved.uuid,
        eventType: 'AssignmentCreated',
        occurredAt: new Date().toISOString(),
        payload: { assignmentUuid: saved.uuid, title: saved.title, lessonUuid: saved.lessonUuid },
      });
    }
    return saved;
  }

  async getSubmissions(assignmentUuid) {
    return this.repository.getSubmissions(assignmentUuid);
  }

  async submitAssignment(input) {
    const assignment = await this.repository.getAssignment(input.assignmentUuid);
    if (!assignment) throw new NotFoundError('Assignment', input.assignmentUuid);
    const entity = AssignmentSubmissionEntity.submit(input);
    const saved = await this.repository.saveSubmission(entity.snapshot());
    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: saved.uuid,
        eventType: 'AssignmentSubmitted',
        occurredAt: new Date().toISOString(),
        payload: { submissionUuid: saved.uuid, assignmentUuid: saved.assignmentUuid, studentEmail: saved.studentEmail },
      });
    }
    return saved;
  }

  async reviewAssignmentSubmission(submissionUuid, { score, feedback, reviewer }) {
    const raw = await this.repository.getSubmissionByUuid(submissionUuid);
    if (!raw) throw new NotFoundError('AssignmentSubmission', submissionUuid);
    const entity = AssignmentSubmissionEntity.restore(raw);
    entity.grade(score, feedback, reviewer);
    const saved = await this.repository.saveSubmission(entity.snapshot());
    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: saved.uuid,
        eventType: 'AssignmentReviewed',
        occurredAt: new Date().toISOString(),
        payload: { submissionUuid: saved.uuid, score: saved.score, studentEmail: saved.studentEmail },
      });
    }
    return saved;
  }

  // Attendance
  async createAttendanceSession(input) {
    const aggregate = AttendanceSessionAggregate.create(input);
    return this.repository.createAttendanceSession(aggregate.snapshot());
  }

  async getAttendanceSessions(classUuid) {
    return this.repository.getAttendanceSessions(classUuid);
  }

  async recordAttendance(sessionUuid, records) {
    if (!Array.isArray(records)) throw new ValidationError('Records must be an array.');
    const results = [];
    for (const item of records) {
      const entity = AttendanceRecordEntity.record({
        sessionUuid,
        studentEmail: item.studentEmail,
        status: item.status,
        notes: item.notes,
      });
      const saved = await this.repository.saveAttendanceRecord(entity.snapshot());
      results.push(saved);
    }
    return results;
  }

  async getAttendanceRecords(sessionUuid) {
    return this.repository.getAttendanceRecords(sessionUuid);
  }

  // Certificates
  async claimCertificate(courseUuid, studentEmail, gradePercentage = 88) {
    const course = await this.repository.getCourse(courseUuid);
    if (!course) throw new NotFoundError('Course', courseUuid);

    const cert = CertificateAggregate.issue({
      courseUuid,
      studentEmail,
      gradePercentage: Number(gradePercentage),
    });
    const saved = await this.repository.saveCertificate(cert.snapshot());
    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: saved.uuid,
        eventType: 'CertificateIssued',
        occurredAt: new Date().toISOString(),
        payload: { certificateCode: saved.certificateCode, studentEmail, courseUuid },
      });
    }
    return saved;
  }

  async getCertificate(certificateCode) {
    const cert = await this.repository.getCertificate(certificateCode);
    if (!cert) throw new NotFoundError('Certificate', certificateCode);
    return cert;
  }

  async getCertificates(studentEmail) {
    return this.repository.getCertificates(studentEmail);
  }
}
