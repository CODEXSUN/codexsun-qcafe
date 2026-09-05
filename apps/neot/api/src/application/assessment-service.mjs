import { QuizAttemptEntity, QuizQuestionEntity, QuizTestAggregate } from '../domain/assessment.mjs';
import { NotFoundError, ValidationError } from '../domain/errors.mjs';

export class AssessmentService {
  constructor(repository, eventBus) {
    this.repository = repository;
    this.eventBus = eventBus;
  }

  async createTest(input) {
    const test = QuizTestAggregate.create(input);
    return this.repository.saveTest(test.snapshot());
  }

  async addQuizQuestion(input) {
    const test = await this.repository.getTest(input.testUuid);
    if (!test) throw new NotFoundError('Quiz Test', input.testUuid);
    const question = QuizQuestionEntity.create(input);
    return this.repository.saveQuizQuestion(question.snapshot());
  }

  async submitAttempt(testUuid, studentEmail, answers) {
    const test = await this.repository.getTest(testUuid);
    if (!test) throw new NotFoundError('Quiz Test', testUuid);

    const questionsState = await this.repository.getQuizQuestions(testUuid);
    if (questionsState.length === 0) {
      throw new ValidationError('This test contains no questions.');
    }

    const questionEntities = questionsState.map(q => QuizQuestionEntity.restore(q));
    const attemptEntity = QuizAttemptEntity.evaluate({
      testUuid,
      studentEmail,
      answers,
      questions: questionEntities,
      passPercentage: test.passPercentage,
    });

    const saved = await this.repository.saveAttempt(attemptEntity.snapshot());

    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: saved.uuid,
        eventType: 'QuizSubmitted',
        occurredAt: new Date().toISOString(),
        payload: {
          testUuid,
          studentEmail,
          percentage: saved.percentage,
          passed: saved.passed,
        },
      });
    }

    return saved;
  }

  async getPerformance(studentEmail) {
    return this.repository.getPerformance(studentEmail);
  }
}
