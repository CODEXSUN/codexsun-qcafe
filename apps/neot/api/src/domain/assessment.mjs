import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.mjs';

export class QuizTestAggregate {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      throw new ValidationError('Test title must be at least 2 characters.');
    }
    if (!input.courseUuid) throw new ValidationError('Course UUID is required.');
    const passPercentage = Math.max(1, Math.min(100, input.passPercentage ?? 60));
    const now = new Date().toISOString();

    return new QuizTestAggregate({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      courseUuid: input.courseUuid,
      lessonUuid: input.lessonUuid ?? null,
      title: trimmedTitle,
      instructions: input.instructions?.trim() ?? '',
      passPercentage,
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
    return new QuizTestAggregate(structuredClone(state));
  }

  get uuid() { return this.state.uuid; }
  get passPercentage() { return this.state.passPercentage; }
  snapshot() { return structuredClone(this.state); }
}

export class QuizQuestionEntity {
  constructor(state) {
    this.state = state;
  }

  static create(input) {
    const prompt = input.prompt?.trim();
    if (!prompt || prompt.length < 3) throw new ValidationError('Quiz question prompt must be at least 3 characters.');
    if (!Array.isArray(input.options) || input.options.length < 2) {
      throw new ValidationError('A quiz question must provide at least 2 options.');
    }
    const correctOption = input.correctOption?.trim();
    if (!correctOption) throw new ValidationError('Correct option must be specified.');
    const now = new Date().toISOString();

    return new QuizQuestionEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      testUuid: input.testUuid,
      prompt,
      options: input.options.map(o => o.trim()),
      correctOption,
      points: Math.max(1, input.points ?? 1),
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
    return new QuizQuestionEntity(structuredClone(state));
  }

  get uuid() { return this.state.uuid; }
  get points() { return this.state.points; }
  isCorrect(selectedOption) {
    return this.state.correctOption.trim().toLowerCase() === String(selectedOption ?? '').trim().toLowerCase();
  }

  snapshot() { return structuredClone(this.state); }
}

export class QuizAttemptEntity {
  constructor(state) {
    this.state = state;
  }

  static evaluate(input) {
    const email = input.studentEmail?.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new ValidationError('Valid student email required.');

    let score = 0;
    let totalPoints = 0;

    for (const q of input.questions) {
      totalPoints += q.points;
      const selected = input.answers[q.uuid];
      if (selected && q.isCorrect(selected)) {
        score += q.points;
      }
    }

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= input.passPercentage;
    const now = new Date().toISOString();

    return new QuizAttemptEntity({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      testUuid: input.testUuid,
      studentEmail: email,
      answers: input.answers,
      score,
      totalPoints,
      percentage,
      passed,
      completedAt: now,
    });
  }

  static restore(state) {
    return new QuizAttemptEntity(structuredClone(state));
  }

  get score() { return this.state.score; }
  get totalPoints() { return this.state.totalPoints; }
  get percentage() { return this.state.percentage; }
  get passed() { return this.state.passed; }

  snapshot() { return structuredClone(this.state); }
}
