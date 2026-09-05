import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.mjs';

export class AssignmentAggregate {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      throw new ValidationError('Assignment title must be at least 2 characters.');
    }
    if (!input.lessonUuid) throw new ValidationError('Lesson UUID is required.');
    const now = new Date().toISOString();

    return new AssignmentAggregate({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      lessonUuid: input.lessonUuid,
      title: trimmedTitle,
      description: input.description?.trim() ?? '',
      maxPoints: Math.max(1, input.maxPoints ?? 100),
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(state) {
    return new AssignmentAggregate(structuredClone(state));
  }

  get uuid() { return this.state.uuid; }
  get maxPoints() { return this.state.maxPoints; }

  snapshot() {
    return structuredClone(this.state);
  }
}

export class AssignmentSubmissionEntity {
  constructor(state) {
    this.state = state;
  }

  static submit(input) {
    const email = input.studentEmail?.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new ValidationError('Valid student email required.');
    if (!input.assignmentUuid) throw new ValidationError('Assignment UUID is required.');
    const now = new Date().toISOString();

    return new AssignmentSubmissionEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      assignmentUuid: input.assignmentUuid,
      studentEmail: email,
      content: input.content?.trim() ?? '',
      attachmentUrl: input.attachmentUrl?.trim() ?? '',
      status: 'submitted',
      score: null,
      feedback: null,
      reviewedBy: null,
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      submittedAt: now,
      reviewedAt: null,
    });
  }

  static restore(state) {
    return new AssignmentSubmissionEntity(structuredClone(state));
  }

  grade(score, feedback, reviewer) {
    if (typeof score !== 'number' || score < 0) {
      throw new ValidationError('Score must be a non-negative number.');
    }
    const now = new Date().toISOString();
    this.state.score = score;
    this.state.feedback = feedback?.trim() ?? '';
    this.state.reviewedBy = reviewer?.trim() ?? 'Master Reviewer';
    this.state.status = 'reviewed';
    this.state.reviewedAt = now;
    this.state.syncUpdatedAt = now;
    this.state.syncVersion += 1;
    this.state.syncStatus = 'local';
  }

  get uuid() { return this.state.uuid; }
  get status() { return this.state.status; }
  get score() { return this.state.score; }
  get studentEmail() { return this.state.studentEmail; }

  snapshot() {
    return structuredClone(this.state);
  }
}
