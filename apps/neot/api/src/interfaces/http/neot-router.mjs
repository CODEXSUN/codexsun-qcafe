import { ValidationError } from '../../domain/errors.mjs';

export class NeotRouter {
  constructor(studyService, assessmentService, syncService) {
    this.studyService = studyService;
    this.assessmentService = assessmentService;
    this.syncService = syncService;
  }

  async dispatch(method, path, body, actor) {
    const studentEmail = actor.email ?? 'student@neot.in';

    // 1. Snapshot & Overview
    if (method === 'GET' && (path === '' || path === '/snapshot')) {
      const data = await this.studyService.getSnapshot(studentEmail);
      return { status: 200, data };
    }

    // 2. Courses
    if (method === 'GET' && path === '/courses') {
      const snapshot = await this.studyService.getSnapshot(studentEmail);
      return { status: 200, data: { courses: snapshot.courses } };
    }
    if (method === 'POST' && path === '/courses') {
      if (!body?.title) throw new ValidationError('Title is required.');
      const course = await this.studyService.createCourse({
        title: body.title,
        description: body.description,
        author: body.author ?? actor.email ?? 'Instructor',
        coverImage: body.coverImage,
        theme: body.theme,
        position: body.position,
        code: body.code,
      });
      return { status: 201, data: course };
    }
    const courseUpdateMatch = path.match(/^\/courses\/([a-zA-Z0-9_-]+)$/);
    if (method === 'PUT' && courseUpdateMatch) {
      const uuid = courseUpdateMatch[1];
      const updated = await this.studyService.updateCourse(uuid, body);
      return { status: 200, data: updated };
    }

    // 3. Subjects
    if (method === 'POST' && path === '/subjects') {
      if (!body?.courseUuid || !body?.title) throw new ValidationError('Course UUID and title are required.');
      const subject = await this.studyService.createSubject({
        courseUuid: body.courseUuid,
        title: body.title,
        description: body.description,
        position: body.position,
      });
      return { status: 201, data: subject };
    }

    // 4. Lessons
    if (method === 'POST' && path === '/lessons') {
      if (!body?.subjectUuid || !body?.title) throw new ValidationError('Subject UUID and title are required.');
      const lesson = await this.studyService.createLesson({
        subjectUuid: body.subjectUuid,
        title: body.title,
        content: body.content,
        author: body.author ?? actor.email ?? 'Instructor',
        position: body.position,
      });
      return { status: 201, data: lesson };
    }
    const lessonUpdateMatch = path.match(/^\/lessons\/([a-zA-Z0-9_-]+)$/);
    if (method === 'PUT' && lessonUpdateMatch) {
      const uuid = lessonUpdateMatch[1];
      const updated = await this.studyService.updateLesson(uuid, body);
      return { status: 200, data: updated };
    }

    // 5. Progress
    const progressMatch = path.match(/^\/lessons\/([a-zA-Z0-9_-]+)\/progress$/);
    if (method === 'PUT' && progressMatch) {
      const lessonUuid = progressMatch[1];
      const status = body?.status === 'completed' ? 'completed' : 'viewed';
      const progress = await this.studyService.recordProgress(lessonUuid, studentEmail, status);
      return { status: 200, data: progress };
    }

    // 6. Discussions
    const discussionMatch = path.match(/^\/lessons\/([a-zA-Z0-9_-]+)\/discussion$/);
    if (method === 'GET' && discussionMatch) {
      const lessonUuid = discussionMatch[1];
      const discussions = await this.studyService.getDiscussions(lessonUuid);
      return { status: 200, data: { discussions } };
    }
    if (method === 'POST' && discussionMatch) {
      const lessonUuid = discussionMatch[1];
      if (!body?.body) throw new ValidationError('Body cannot be empty.');
      const author = body.author ?? actor.email ?? 'Anonymous';
      const post = await this.studyService.addDiscussion(lessonUuid, author, body.body, body.parentUuid);
      return { status: 201, data: post };
    }

    // 7. Questions & Answers
    if (method === 'POST' && path === '/questions') {
      if (!body?.lessonUuid || !body?.questionText) throw new ValidationError('Lesson UUID and questionText are required.');
      const askedBy = body.askedBy ?? actor.email ?? 'student@neot.in';
      const question = await this.studyService.askQuestion(body.lessonUuid, askedBy, body.questionText);
      return { status: 201, data: question };
    }
    if (method === 'POST' && path === '/answers') {
      if (!body?.questionUuid || !body?.answerText) throw new ValidationError('Question UUID and answerText are required.');
      const answeredBy = body.answeredBy ?? actor.email ?? 'master@neot.in';
      const answer = await this.studyService.answerQuestion(body.questionUuid, answeredBy, body.answerText);
      return { status: 201, data: answer };
    }
    const acceptAnswerMatch = path.match(/^\/answers\/([a-zA-Z0-9_-]+)\/accept$/);
    if (method === 'POST' && acceptAnswerMatch) {
      const answerUuid = acceptAnswerMatch[1];
      if (!body?.questionUuid) throw new ValidationError('questionUuid required in body.');
      const accepted = await this.studyService.acceptAnswer(answerUuid, body.questionUuid);
      return { status: 200, data: accepted };
    }

    // 8. Classes & Enrollments
    if (method === 'POST' && path === '/classes') {
      if (!body?.courseUuid || !body?.title) throw new ValidationError('Course UUID and title are required.');
      const cls = await this.studyService.createClass({
        courseUuid: body.courseUuid,
        title: body.title,
        masterEmail: body.masterEmail,
        scheduleText: body.scheduleText,
      });
      return { status: 201, data: cls };
    }
    if (method === 'POST' && path === '/enrollments') {
      if (!body?.courseUuid || !body?.memberEmail) throw new ValidationError('Course UUID and memberEmail are required.');
      const enrollment = await this.studyService.enroll({
        courseUuid: body.courseUuid,
        classUuid: body.classUuid,
        memberEmail: body.memberEmail,
        memberName: body.memberName,
        role: body.role,
      });
      return { status: 201, data: enrollment };
    }

    // 9. Tests & Quizzes
    if (method === 'POST' && path === '/tests') {
      if (!body?.courseUuid || !body?.title) throw new ValidationError('Course UUID and title are required.');
      const test = await this.assessmentService.createTest({
        courseUuid: body.courseUuid,
        lessonUuid: body.lessonUuid,
        title: body.title,
        instructions: body.instructions,
        passPercentage: body.passPercentage,
      });
      return { status: 201, data: test };
    }
    const addQuestionMatch = path.match(/^\/tests\/([a-zA-Z0-9_-]+)\/questions$/);
    if (method === 'POST' && addQuestionMatch) {
      const testUuid = addQuestionMatch[1];
      const q = await this.assessmentService.addQuizQuestion({
        testUuid,
        prompt: body.prompt,
        options: body.options,
        correctOption: body.correctOption,
        points: body.points,
        position: body.position,
      });
      return { status: 201, data: q };
    }
    const attemptMatch = path.match(/^\/tests\/([a-zA-Z0-9_-]+)\/attempts$/);
    if (method === 'POST' && attemptMatch) {
      const testUuid = attemptMatch[1];
      const answers = body?.answers ?? {};
      const attempt = await this.assessmentService.submitAttempt(testUuid, studentEmail, answers);
      return { status: 200, data: attempt };
    }

    // 10. Assignments & Evidence
    const lessonAssignmentsMatch = path.match(/^\/lessons\/([a-zA-Z0-9_-]+)\/assignments$/);
    if (method === 'GET' && lessonAssignmentsMatch) {
      const items = await this.studyService.getAssignments(lessonAssignmentsMatch[1]);
      return { status: 200, data: items };
    }
    if (method === 'POST' && path === '/assignments') {
      const assignment = await this.studyService.createAssignment(body);
      return { status: 201, data: assignment };
    }
    const assignmentMatch = path.match(/^\/assignments\/([a-zA-Z0-9_-]+)$/);
    if (method === 'GET' && assignmentMatch) {
      const item = await this.studyService.getAssignment(assignmentMatch[1]);
      return { status: 200, data: item };
    }
    const submissionsMatch = path.match(/^\/assignments\/([a-zA-Z0-9_-]+)\/submissions$/);
    if (method === 'GET' && submissionsMatch) {
      const items = await this.studyService.getSubmissions(submissionsMatch[1]);
      return { status: 200, data: items };
    }
    if (method === 'POST' && submissionsMatch) {
      const assignmentUuid = submissionsMatch[1];
      const submission = await this.studyService.submitAssignment({
        assignmentUuid,
        studentEmail: body.studentEmail || studentEmail,
        content: body.content,
        attachmentUrl: body.attachmentUrl,
      });
      return { status: 201, data: submission };
    }
    const reviewMatch = path.match(/^\/submissions\/([a-zA-Z0-9_-]+)\/review$/);
    if (method === 'PUT' && reviewMatch) {
      const submissionUuid = reviewMatch[1];
      const reviewed = await this.studyService.reviewAssignmentSubmission(submissionUuid, {
        score: body.score,
        feedback: body.feedback,
        reviewer: body.reviewer,
      });
      return { status: 200, data: reviewed };
    }

    // 11. Attendance
    const classSessionsMatch = path.match(/^\/classes\/([a-zA-Z0-9_-]+)\/attendance\/sessions$/);
    if (method === 'GET' && classSessionsMatch) {
      const sessions = await this.studyService.getAttendanceSessions(classSessionsMatch[1]);
      return { status: 200, data: sessions };
    }
    if (method === 'POST' && classSessionsMatch) {
      const classUuid = classSessionsMatch[1];
      const session = await this.studyService.createAttendanceSession({
        classUuid,
        sessionDate: body.sessionDate,
        topic: body.topic,
        createdBy: body.createdBy,
      });
      return { status: 201, data: session };
    }
    const sessionRecordsMatch = path.match(/^\/attendance\/sessions\/([a-zA-Z0-9_-]+)\/records$/);
    if (method === 'GET' && sessionRecordsMatch) {
      const records = await this.studyService.getAttendanceRecords(sessionRecordsMatch[1]);
      return { status: 200, data: records };
    }
    if (method === 'POST' && sessionRecordsMatch) {
      const sessionUuid = sessionRecordsMatch[1];
      const recorded = await this.studyService.recordAttendance(sessionUuid, body.records ?? []);
      return { status: 200, data: recorded };
    }

    // 12. Certificates
    const certClaimMatch = path.match(/^\/courses\/([a-zA-Z0-9_-]+)\/certificates\/claim$/);
    if (method === 'POST' && certClaimMatch) {
      const courseUuid = certClaimMatch[1];
      const cert = await this.studyService.claimCertificate(courseUuid, body.studentEmail || studentEmail, body.gradePercentage);
      return { status: 201, data: cert };
    }
    const certGetMatch = path.match(/^\/certificates\/([a-zA-Z0-9_-]+)$/);
    if (method === 'GET' && certGetMatch) {
      const cert = await this.studyService.getCertificate(certGetMatch[1]);
      return { status: 200, data: cert };
    }
    if (method === 'GET' && path === '/certificates') {
      const certs = await this.studyService.getCertificates(studentEmail);
      return { status: 200, data: certs };
    }

    // 13. Sync with neot.in
    if (method === 'GET' && path === '/sync/status') {
      const status = await this.syncService.getStatus();
      return { status: 200, data: status };
    }
    if (method === 'POST' && path === '/sync/health') {
      const health = await this.syncService.checkCloudHealth();
      return { status: 200, data: health };
    }
    if (method === 'POST' && path === '/sync/pull') {
      const result = await this.syncService.pullFromCloud(body?.token);
      return { status: 200, data: result };
    }
    if (method === 'POST' && path === '/sync/push') {
      const result = await this.syncService.pushToCloud(body?.token);
      return { status: 200, data: result };
    }

    return { status: 404, data: { error: `Route not found: ${method} /api/v1/neot${path}` } };
  }
}
