import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.mjs';

export class AttendanceSessionAggregate {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    if (!input.classUuid) throw new ValidationError('Class UUID is required.');
    const date = input.sessionDate ?? new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    return new AttendanceSessionAggregate({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      classUuid: input.classUuid,
      sessionDate: date,
      topic: input.topic?.trim() ?? '',
      createdBy: input.createdBy?.trim() ?? '',
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      createdAt: now,
    });
  }

  static restore(state) {
    return new AttendanceSessionAggregate(structuredClone(state));
  }

  get uuid() { return this.state.uuid; }
  get classUuid() { return this.state.classUuid; }

  snapshot() {
    return structuredClone(this.state);
  }
}

export class AttendanceRecordEntity {
  constructor(state) {
    this.state = state;
  }

  static record(input) {
    const validStatuses = ['present', 'late', 'absent', 'excused'];
    if (!validStatuses.includes(input.status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    const email = input.studentEmail?.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new ValidationError('Valid student email required.');
    const now = new Date().toISOString();

    return new AttendanceRecordEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      sessionUuid: input.sessionUuid,
      studentEmail: email,
      status: input.status,
      notes: input.notes?.trim() ?? '',
      syncId: randomUUID(),
      syncStatus: 'local',
      syncVersion: 1,
      syncUpdatedAt: now,
      updatedAt: now,
    });
  }

  static restore(state) {
    return new AttendanceRecordEntity(structuredClone(state));
  }

  get status() { return this.state.status; }
  get studentEmail() { return this.state.studentEmail; }

  snapshot() {
    return structuredClone(this.state);
  }
}
