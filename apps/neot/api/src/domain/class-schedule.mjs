import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.mjs';

export class ClassScheduleAggregate {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      throw new ValidationError('Class title must be at least 2 characters.');
    }
    if (!input.courseUuid) throw new ValidationError('Course UUID is required.');
    const now = new Date().toISOString();

    return new ClassScheduleAggregate({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      courseUuid: input.courseUuid,
      title: trimmedTitle,
      masterEmail: input.masterEmail?.trim().toLowerCase() ?? '',
      scheduleText: input.scheduleText?.trim() ?? '',
      status: 'scheduled',
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(state) {
    return new ClassScheduleAggregate(structuredClone(state));
  }

  get uuid() { return this.state.uuid; }
  get courseUuid() { return this.state.courseUuid; }
  get title() { return this.state.title; }

  update(input) {
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (trimmed.length < 2) throw new ValidationError('Class title must be at least 2 characters.');
      this.state.title = trimmed;
    }
    if (input.masterEmail !== undefined) this.state.masterEmail = input.masterEmail.trim().toLowerCase();
    if (input.scheduleText !== undefined) this.state.scheduleText = input.scheduleText.trim();
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

export class EnrollmentEntity {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const email = input.memberEmail?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new ValidationError('A valid member email address is required.');
    }
    if (!input.courseUuid) throw new ValidationError('Course UUID is required.');
    const now = new Date().toISOString();

    return new EnrollmentEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      courseUuid: input.courseUuid,
      classUuid: input.classUuid ?? null,
      memberEmail: email,
      memberName: input.memberName?.trim() ?? '',
      role: input.role ?? 'student',
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
    return new EnrollmentEntity(structuredClone(state));
  }

  snapshot() {
    return structuredClone(this.state);
  }
}
