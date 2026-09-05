import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.mjs';

export class CourseAggregate {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      throw new ValidationError('Course title must be at least 2 characters.');
    }
    const now = new Date().toISOString();
    const code = (input.code ?? trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).slice(0, 32);

    return new CourseAggregate({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      code: code || 'course',
      title: trimmedTitle,
      description: input.description?.trim() ?? '',
      author: input.author?.trim() ?? '',
      coverImage: input.coverImage?.trim() ?? '',
      theme: input.theme ?? 'forest',
      position: input.position ?? 0,
      status: 'active',
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(state) {
    return new CourseAggregate(structuredClone(state));
  }

  get uuid() { return this.state.uuid; }
  get code() { return this.state.code; }
  get title() { return this.state.title; }
  get status() { return this.state.status; }

  update(input) {
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (trimmed.length < 2) throw new ValidationError('Course title must be at least 2 characters.');
      this.state.title = trimmed;
    }
    if (input.description !== undefined) this.state.description = input.description.trim();
    if (input.author !== undefined) this.state.author = input.author.trim();
    if (input.coverImage !== undefined) this.state.coverImage = input.coverImage.trim();
    if (input.theme !== undefined) this.state.theme = input.theme;
    if (input.position !== undefined) this.state.position = input.position;
    if (input.status !== undefined) this.state.status = input.status;
    this.touch();
  }

  archive() {
    this.state.status = 'archived';
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

export class SubjectEntity {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      throw new ValidationError('Subject title must be at least 2 characters.');
    }
    if (!input.courseUuid) throw new ValidationError('Course UUID is required.');
    const now = new Date().toISOString();

    return new SubjectEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      courseUuid: input.courseUuid,
      title: trimmedTitle,
      description: input.description?.trim() ?? '',
      position: input.position ?? 0,
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(state) {
    return new SubjectEntity(structuredClone(state));
  }

  get uuid() { return this.state.uuid; }
  get courseUuid() { return this.state.courseUuid; }
  get title() { return this.state.title; }

  update(input) {
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (trimmed.length < 2) throw new ValidationError('Subject title must be at least 2 characters.');
      this.state.title = trimmed;
    }
    if (input.description !== undefined) this.state.description = input.description.trim();
    if (input.position !== undefined) this.state.position = input.position;
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
