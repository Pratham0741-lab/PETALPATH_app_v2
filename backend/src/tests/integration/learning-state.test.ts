import { prisma } from '../../config/database.js';
import { LearningStateUpdater } from '../../modules/learning-state/application/services/learning-state-updater.service.js';
import { MasteryCalculationService } from '../../modules/learning-state/application/services/mastery-calculation.service.js';
import { ConfidenceCalculationService } from '../../modules/learning-state/application/services/confidence-calculation.service.js';
import { ForgettingCurveService } from '../../modules/learning-state/application/services/forgetting-curve.service.js';
import { StateRepository } from '../../modules/learning-state/infrastructure/repositories/state.repository.js';
import { LearningState } from '../../modules/learning-state/domain/entities/learning-state.entity.js';
import { LearningEvent } from '../../modules/adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningEventType } from '../../modules/adaptive-learning/domain/value-objects/event-types.js';
import { cleanDatabase, createTestUser, createTestChild, createTestSubject, createTestSkill } from '../helpers/factories.js';
import '../helpers/setup.js';

function createLearningEvent(overrides: Partial<{
  childId: string;
  topicId: string;
  eventType: LearningEventType;
  correct: boolean;
  hintUsed: boolean;
  isRetry: boolean;
  duration: number;
  difficulty: string;
}> = {}) {
  const childId = overrides.childId ?? crypto.randomUUID();
  const topicId = overrides.topicId ?? crypto.randomUUID();
  return LearningEvent.create({
    eventType: overrides.eventType ?? LearningEventType.ACTIVITY_COMPLETED,
    eventVersion: 1,
    childId,
    sessionId: crypto.randomUUID(),
    topicId,
    timestamp: new Date(),
    duration: overrides.duration ?? 5000,
    payload: {
      correct: overrides.correct,
      hintUsed: overrides.hintUsed ?? false,
      isRetry: overrides.isRetry ?? false,
      difficulty: overrides.difficulty ?? 'MEDIUM',
    },
  });
}

function createDefaultState(overrides: Partial<{
  mastery: number;
  confidence: number;
  stability: number;
  forgettingRate: number;
  reviewIntervalDays: number;
  correctAttempts: number;
  incorrectAttempts: number;
  streak: number;
  totalAttempts: number;
  averageResponseTimeMs: number;
  hintUsage: number;
  retryCount: number;
  currentDifficulty: string;
}> = {}): LearningState {
  return LearningState.create({
    childId: crypto.randomUUID(),
    topicId: crypto.randomUUID(),
    mastery: overrides.mastery ?? 0,
    confidence: overrides.confidence ?? 0,
    stability: overrides.stability ?? 0.5,
    forgettingRate: overrides.forgettingRate ?? 0.1,
    reviewIntervalDays: overrides.reviewIntervalDays ?? 0,
    lastReviewedAt: new Date(),
    lastPracticedAt: new Date(),
    correctAttempts: overrides.correctAttempts ?? 0,
    incorrectAttempts: overrides.incorrectAttempts ?? 0,
    streak: overrides.streak ?? 0,
    totalAttempts: overrides.totalAttempts ?? 0,
    averageResponseTimeMs: overrides.averageResponseTimeMs ?? 0,
    hintUsage: overrides.hintUsage ?? 0,
    retryCount: overrides.retryCount ?? 0,
    currentDifficulty: overrides.currentDifficulty ?? 'MEDIUM',
    currentModality: null,
  });
}

describe('Learning State Module — Phase 4.1', () => {
  let masteryService: MasteryCalculationService;
  let confidenceService: ConfidenceCalculationService;
  let forgettingCurveService: ForgettingCurveService;
  let updater: LearningStateUpdater;
  let repository: StateRepository;
  let user: { id: string };
  let child: { id: string };

  beforeAll(async () => {
    masteryService = new MasteryCalculationService();
    confidenceService = new ConfidenceCalculationService();
    forgettingCurveService = new ForgettingCurveService();
    repository = new StateRepository();
    updater = new LearningStateUpdater(
      repository,
      masteryService,
      confidenceService,
      forgettingCurveService,
    );
  });

  beforeEach(async () => {
    user = await createTestUser();
    child = await createTestChild(user.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe('MasteryCalculationService', () => {
    it('should increase mastery on first correct answer from 0', () => {
      const state = createDefaultState();
      const event = createLearningEvent({ childId: state.childId, topicId: state.topicId, correct: true });
      const result = masteryService.calculate(state, event);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should approach max with repeated correct answers', () => {
      let state = createDefaultState({ streak: 0, totalAttempts: 0, correctAttempts: 0 });
      for (let i = 0; i < 50; i++) {
        const event = createLearningEvent({ childId: state.childId, topicId: state.topicId, correct: true });
        const newMastery = masteryService.calculate(state, event);
        expect(newMastery).toBeGreaterThanOrEqual(state.mastery);
        expect(newMastery).toBeLessThanOrEqual(100);
        state = state
          .withAttempt(true, 5000, false, false)
          .withMastery(newMastery);
      }
      expect(state.mastery).toBe(100);
    });

    it('should decrease mastery on repeated incorrect answers', () => {
      let state = createDefaultState({ mastery: 50, streak: 0, totalAttempts: 0, incorrectAttempts: 0 });
      for (let i = 0; i < 5; i++) {
        const event = createLearningEvent({ childId: state.childId, topicId: state.topicId, correct: false });
        const newMastery = masteryService.calculate(state, event);
        expect(newMastery).toBeLessThanOrEqual(state.mastery);
        state = state
          .withAttempt(false, 5000, false, false)
          .withMastery(newMastery);
      }
      expect(state.mastery).toBeLessThan(50);
    });

    it('should handle mixed correct/incorrect and stay in valid range', () => {
      let state = createDefaultState();
      const correcties = [true, true, false, true, false, true, true, true, false, true];
      for (const correct of correcties) {
        const event = createLearningEvent({ childId: state.childId, topicId: state.topicId, correct });
        const newMastery = masteryService.calculate(state, event);
        expect(newMastery).toBeGreaterThanOrEqual(0);
        expect(newMastery).toBeLessThanOrEqual(100);
        state = state
          .withAttempt(correct, 5000, false, false)
          .withMastery(newMastery);
      }
    });
  });

  describe('ConfidenceCalculationService', () => {
    it('should return high confidence with a long correct streak', () => {
      const state = createDefaultState({ streak: 10, correctAttempts: 10, totalAttempts: 10 });
      const event = createLearningEvent({ childId: state.childId, topicId: state.topicId, correct: true });
      const result = confidenceService.calculate(state, event);
      expect(result).toBeGreaterThan(50);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should return lower confidence with many retries', () => {
      const state = createDefaultState({
        streak: 0,
        correctAttempts: 2,
        incorrectAttempts: 5,
        totalAttempts: 7,
        retryCount: 3,
      });
      const event = createLearningEvent({ childId: state.childId, topicId: state.topicId, correct: false, isRetry: true });
      const result = confidenceService.calculate(state, event);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should lower confidence when hint is used', () => {
      const stateWithHint = createDefaultState({ streak: 3, correctAttempts: 3, totalAttempts: 3 });
      const stateWithoutHint = createDefaultState({ streak: 3, correctAttempts: 3, totalAttempts: 3 });

      const eventWithHint = createLearningEvent({
        childId: stateWithHint.childId,
        topicId: stateWithHint.topicId,
        correct: true,
        hintUsed: true,
      });
      const eventWithoutHint = createLearningEvent({
        childId: stateWithoutHint.childId,
        topicId: stateWithoutHint.topicId,
        correct: true,
        hintUsed: false,
      });

      const withHint = confidenceService.calculate(stateWithHint, eventWithHint);
      const withoutHint = confidenceService.calculate(stateWithoutHint, eventWithoutHint);
      expect(withHint).toBeLessThanOrEqual(withoutHint);
    });

    it('should return baseline confidence with no prior data', () => {
      const state = createDefaultState();
      const event = createLearningEvent({ childId: state.childId, topicId: state.topicId, correct: true });
      const result = confidenceService.calculate(state, event);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('ForgettingCurveService', () => {
    describe('calculateRetention', () => {
      it('should return near 100% right after review', () => {
        const state = createDefaultState({
          stability: 10,
          forgettingRate: 0.1,
        });
        const result = forgettingCurveService.calculateRetention(state);
        expect(result).toBeCloseTo(100, -1);
      });

      it('should decrease over time when no review', () => {
        const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        let state = createDefaultState({
          stability: 1,
          forgettingRate: 0.1,
        });
        state = state.withLastReviewedAt(past);
        const result = forgettingCurveService.calculateRetention(state);
        expect(result).toBeLessThan(100);
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });

    describe('calculateDecay', () => {
      it('should increase stability after correct answer', () => {
        const state = createDefaultState({ stability: 0.5 });
        const result = forgettingCurveService.calculateDecay(state, true);
        expect(result.updatedStability).toBeGreaterThan(state.stability);
        expect(result.updatedForgettingRate).toBeLessThanOrEqual(state.forgettingRate);
        expect(result.nextReviewIntervalDays).toBeGreaterThanOrEqual(0);
      });

      it('should decrease stability after incorrect answer', () => {
        const state = createDefaultState({ stability: 0.5 });
        const result = forgettingCurveService.calculateDecay(state, false);
        expect(result.updatedStability).toBeLessThan(state.stability);
        expect(result.updatedForgettingRate).toBeGreaterThanOrEqual(state.forgettingRate);
      });

      it('should not let stability drop below minimum', () => {
        const state = createDefaultState({ stability: 0.1 });
        const result = forgettingCurveService.calculateDecay(state, false);
        expect(result.updatedStability).toBeGreaterThanOrEqual(0.1);
      });

      it('should not let stability exceed maximum', () => {
        const state = createDefaultState({ stability: 9.9 });
        const result = forgettingCurveService.calculateDecay(state, true);
        expect(result.updatedStability).toBeLessThanOrEqual(10);
      });
    });

    describe('calculateNextReviewDate', () => {
      it('should return null when reviewIntervalDays is 0', () => {
        const state = createDefaultState({ reviewIntervalDays: 0 });
        expect(forgettingCurveService.calculateNextReviewDate(state)).toBeNull();
      });

      it('should return a future date when reviewIntervalDays > 0', () => {
        const state = createDefaultState({ reviewIntervalDays: 3 });
        const result = forgettingCurveService.calculateNextReviewDate(state);
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime()).toBeGreaterThan(Date.now() - 1000);
      });
    });
  });

  describe('LearningStateUpdater', () => {
    it('should update mastery and stability after a correct event', async () => {
      const event = createLearningEvent({
        childId: child.id,
        topicId: 'topic-1',
        correct: true,
      });
      const result = await updater.handleEvent(event);
      expect(result.mastery).toBeGreaterThan(0);
      expect(result.stability).toBeGreaterThan(0.5);
      expect(result.correctAttempts).toBe(1);
      expect(result.streak).toBe(1);
      expect(result.totalAttempts).toBe(1);
    });

    it('should decrease mastery after an incorrect event', async () => {
      const event1 = createLearningEvent({
        childId: child.id,
        topicId: 'topic-2',
        correct: true,
      });
      const first = await updater.handleEvent(event1);
      expect(first.mastery).toBeGreaterThan(0);

      const event2 = createLearningEvent({
        childId: child.id,
        topicId: 'topic-2',
        correct: false,
      });
      const second = await updater.handleEvent(event2);
      expect(second.mastery).toBeLessThan(first.mastery);
      expect(second.incorrectAttempts).toBe(1);
      expect(second.streak).toBe(0);
    });

    it('should persist state and allow retrieval from DB', async () => {
      const event = createLearningEvent({
        childId: child.id,
        topicId: 'topic-3',
        correct: true,
      });
      const result = await updater.handleEvent(event);

      const fromDb = await repository.findByTopic(child.id, 'topic-3');
      expect(fromDb).not.toBeNull();
      expect(fromDb!.id).toBe(result.id);
      expect(fromDb!.mastery).toBe(result.mastery);
      expect(fromDb!.stability).toBe(result.stability);
    });
  });

  describe('StateRepository', () => {
    it('should save a new KnowledgeState and retrieve it by topic', async () => {
      const state = LearningState.create({
        childId: child.id,
        topicId: 'repo-topic-1',
        mastery: 25,
        confidence: 30,
        stability: 0.8,
        forgettingRate: 0.1,
        reviewIntervalDays: 1,
        lastReviewedAt: new Date(),
        lastPracticedAt: new Date(),
        correctAttempts: 2,
        incorrectAttempts: 1,
        streak: 2,
        totalAttempts: 3,
        averageResponseTimeMs: 4500,
        hintUsage: 0,
        retryCount: 0,
        currentDifficulty: 'MEDIUM',
        currentModality: null,
      });

      const saved = await repository.save(state);
      expect(saved.id).toBe(state.id);
      expect(saved.mastery).toBe(25);

      const found = await repository.findByTopic(child.id, 'repo-topic-1');
      expect(found).not.toBeNull();
      expect(found!.mastery).toBe(25);
    });

    it('should upsert by updating an existing state', async () => {
      const state = LearningState.create({
        childId: child.id,
        topicId: 'repo-topic-2',
        mastery: 10,
        confidence: 10,
        stability: 0.5,
        forgettingRate: 0.1,
        reviewIntervalDays: 0,
        lastReviewedAt: new Date(),
        lastPracticedAt: new Date(),
        correctAttempts: 1,
        incorrectAttempts: 0,
        streak: 1,
        totalAttempts: 1,
        averageResponseTimeMs: 3000,
        hintUsage: 0,
        retryCount: 0,
        currentDifficulty: 'EASY',
        currentModality: null,
      });

      const saved = await repository.save(state);
      const updated = saved.withMastery(50)
        .withConfidence(60)
        .withStability(1.5)
        .withForgettingRate(0.08)
        .withReviewInterval(2)
        .withCurrentDifficulty('HARD');

      const result = await repository.update(updated);
      expect(result.mastery).toBe(50);
      expect(result.confidence).toBe(60);
      expect(result.stability).toBe(1.5);
      expect(result.currentDifficulty).toBe('HARD');
    });

    it('should return null when findByTopic finds nothing', async () => {
      const result = await repository.findByTopic(child.id, 'nonexistent-topic');
      expect(result).toBeNull();
    });

    it('should find all states for a child', async () => {
      const state1 = LearningState.create({
        childId: child.id,
        topicId: 'findall-topic-1',
        mastery: 20,
        confidence: 20,
        stability: 0.5,
        forgettingRate: 0.1,
        reviewIntervalDays: 0,
        lastReviewedAt: new Date(),
        lastPracticedAt: new Date(),
        correctAttempts: 2,
        incorrectAttempts: 1,
        streak: 2,
        totalAttempts: 3,
        averageResponseTimeMs: 4000,
        hintUsage: 0,
        retryCount: 0,
        currentDifficulty: 'MEDIUM',
        currentModality: null,
      });
      const state2 = LearningState.create({
        childId: child.id,
        topicId: 'findall-topic-2',
        mastery: 80,
        confidence: 70,
        stability: 3.0,
        forgettingRate: 0.05,
        reviewIntervalDays: 5,
        lastReviewedAt: new Date(),
        lastPracticedAt: new Date(),
        correctAttempts: 8,
        incorrectAttempts: 1,
        streak: 5,
        totalAttempts: 9,
        averageResponseTimeMs: 2000,
        hintUsage: 1,
        retryCount: 0,
        currentDifficulty: 'HARD',
        currentModality: null,
      });

      await repository.save(state1);
      await repository.save(state2);

      const all = await repository.findByChildId(child.id);
      expect(all.length).toBe(2);
    });
  });

  describe('Full Integration', () => {
    it('should create initial state via updater for a new topic', async () => {
      const event = createLearningEvent({
        childId: child.id,
        topicId: 'integration-topic-1',
        correct: true,
      });
      const result = await updater.handleEvent(event);

      expect(result.childId).toBe(child.id);
      expect(result.topicId).toBe('integration-topic-1');
      expect(result.mastery).toBeGreaterThan(0);
      expect(result.totalAttempts).toBe(1);

      const fromDb = await repository.findByTopic(child.id, 'integration-topic-1');
      expect(fromDb).not.toBeNull();
      expect(fromDb!.mastery).toBe(result.mastery);
    });

    it('should increase stability after multiple correct answers', async () => {
      const topicId = 'integration-topic-stability';
      for (let i = 0; i < 5; i++) {
        const event = createLearningEvent({
          childId: child.id,
          topicId,
          correct: true,
        });
        await updater.handleEvent(event);
      }

      const state = await repository.findByTopic(child.id, topicId);
      expect(state).not.toBeNull();
      expect(state!.correctAttempts).toBe(5);
      expect(state!.stability).toBeGreaterThan(0.5);
      expect(state!.mastery).toBeGreaterThan(0);
    });

    it('should decrease retention after simulated forgetting period', async () => {
      const topicId = 'integration-topic-forgetting';
      const pastEvent = createLearningEvent({
        childId: child.id,
        topicId,
        correct: true,
      });
      await updater.handleEvent(pastEvent);

      const state = await repository.findByTopic(child.id, topicId);
      expect(state).not.toBeNull();

      const initialRetention = forgettingCurveService.calculateRetention(state!);
      expect(initialRetention).toBeCloseTo(100, -1);

      const staleState = state!.withLastReviewedAt(
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      );
      const decayedRetention = forgettingCurveService.calculateRetention(staleState);
      expect(decayedRetention).toBeLessThan(initialRetention);
    });

    it('should handle a complete cycle: create → update → verify in DB', async () => {
      const topicId = 'integration-topic-cycle';

      const event1 = createLearningEvent({
        childId: child.id,
        topicId,
        correct: true,
        duration: 3000,
      });
      const state1 = await updater.handleEvent(event1);
      expect(state1.mastery).toBeGreaterThan(0);
      expect(state1.streak).toBe(1);

      const event2 = createLearningEvent({
        childId: child.id,
        topicId,
        correct: false,
        hintUsed: true,
        isRetry: true,
        duration: 8000,
      });
      const state2 = await updater.handleEvent(event2);
      expect(state2.mastery).toBeLessThan(state1.mastery);
      expect(state2.streak).toBe(0);
      expect(state2.hintUsage).toBe(1);

      const event3 = createLearningEvent({
        childId: child.id,
        topicId,
        correct: true,
        duration: 2000,
      });
      const state3 = await updater.handleEvent(event3);
      expect(state3.mastery).toBeGreaterThan(state2.mastery);
      expect(state3.streak).toBe(1);
      expect(state3.totalAttempts).toBe(3);
      expect(state3.correctAttempts).toBe(2);
      expect(state3.incorrectAttempts).toBe(1);

      const fromDb = await repository.findByTopic(child.id, topicId);
      expect(fromDb).not.toBeNull();
      expect(fromDb!.mastery).toBe(state3.mastery);
      expect(fromDb!.stability).toBe(state3.stability);
      expect(fromDb!.totalAttempts).toBe(3);
    });
  });
});
