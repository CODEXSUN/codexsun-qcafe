import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.mjs';

export class LessonAggregate {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      throw new ValidationError('Lesson title must be at least 2 characters.');
    }
    if (!input.subjectUuid) throw new ValidationError('Subject UUID is required.');
    const now = new Date().toISOString();

    return new LessonAggregate({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      subjectUuid: input.subjectUuid,
      title: trimmedTitle,
      content: input.content ?? '',
      author: input.author?.trim() ?? '',
      position: input.position ?? 0,
      status: 'published',
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(state) {
    return new LessonAggregate(structuredClone(state));
  }

  get uuid() { return this.state.uuid; }
  get subjectUuid() { return this.state.subjectUuid; }
  get title() { return this.state.title; }
  get content() { return this.state.content; }

  update(input) {
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (trimmed.length < 2) throw new ValidationError('Lesson title must be at least 2 characters.');
      this.state.title = trimmed;
    }
    if (input.content !== undefined) this.state.content = input.content;
    if (input.author !== undefined) this.state.author = input.author.trim();
    if (input.position !== undefined) this.state.position = input.position;
    if (input.status !== undefined) this.state.status = input.status;
    this.touch();
  }

  touch() {
    const now = new Date().toISOString();
    this.state.updatedAt = now;
    this.state.syncUpdatedAt = now;
    this.state.syncVersion += 1;
    this.state.syncStatus = 'local';
  }

  snapshot() {
    return structuredClone(this.state);
  }
}

export class LessonProgressEntity {
  constructor(state) {
    this.state = state;
  }

  static createOrUpdate(input) {
    const now = new Date().toISOString();
    if (input.existing) {
      const updated = structuredClone(input.existing);
      updated.status = input.status;
      updated.lastOpenedAt = now;
      if (input.status === 'completed' && !updated.completedAt) {
        updated.completedAt = now;
      }
      return new LessonProgressEntity(updated);
    }

    return new LessonProgressEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      lessonUuid: input.lessonUuid,
      studentEmail: input.studentEmail.trim().toLowerCase(),
      status: input.status,
      lastOpenedAt: now,
      completedAt: input.status === 'completed' ? now : null,
    });
  }

  static restore(state) {
    return new LessonProgressEntity(structuredClone(state));
  }

  get isCompleted() { return this.state.status === 'completed'; }
  snapshot() { return structuredClone(this.state); }
}
