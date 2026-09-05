import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.mjs';

export class QuestionEntity {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const text = input.questionText?.trim();
    if (!text || text.length < 3) throw new ValidationError('Question text must be at least 3 characters.');
    if (!input.lessonUuid) throw new ValidationError('Lesson UUID is required.');
    const now = new Date().toISOString();

    return new QuestionEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      lessonUuid: input.lessonUuid,
      askedBy: input.askedBy.trim(),
      questionText: text,
      status: 'open',
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(state) {
    return new QuestionEntity(structuredClone(state));
  }

  markAnswered() {
    this.state.status = 'answered';
    const now = new Date().toISOString();
    this.state.updatedAt = now;
    this.state.syncUpdatedAt = now;
    this.state.syncVersion += 1;
    this.state.syncStatus = 'local';
  }

  snapshot() { return structuredClone(this.state); }
}

export class AnswerEntity {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const text = input.answerText?.trim();
    if (!text || text.length < 2) throw new ValidationError('Answer text must be at least 2 characters.');
    if (!input.questionUuid) throw new ValidationError('Question UUID is required.');
    const now = new Date().toISOString();

    return new AnswerEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      questionUuid: input.questionUuid,
      answeredBy: input.answeredBy.trim(),
      answerText: text,
      accepted: false,
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(state) {
    return new AnswerEntity(structuredClone(state));
  }

  markAccepted() {
    this.state.accepted = true;
    const now = new Date().toISOString();
    this.state.updatedAt = now;
    this.state.syncUpdatedAt = now;
    this.state.syncVersion += 1;
    this.state.syncStatus = 'local';
  }

  snapshot() { return structuredClone(this.state); }
}

export class DiscussionPostEntity {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const body = input.body?.trim();
    if (!body || body.length < 1) throw new ValidationError('Discussion body cannot be empty.');
    if (!input.lessonUuid) throw new ValidationError('Lesson UUID is required.');
    const now = new Date().toISOString();

    return new DiscussionPostEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      lessonUuid: input.lessonUuid,
      parentUuid: input.parentUuid ?? null,
      author: input.author.trim(),
      body,
      createdAt: now,
    });
  }

  static restore(state) {
    return new DiscussionPostEntity(structuredClone(state));
  }

  snapshot() { return structuredClone(this.state); }
}
