import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestUser, createTestChild, createTestSubject, createTestSkill } from '../helpers/factories.js';
import '../helpers/setup.js';

import { TopicStateRepository } from '../../modules/intelligence-core/infrastructure/repositories/topic-state.repository.js';
import { KnowledgeStateRepository } from '../../modules/intelligence-core/infrastructure/repositories/knowledge-state.repository.js';
import { ObservationEngine, type ObservationEventInput } from '../../modules/intelligence-core/application/services/observation-engine.service.js';
import { EvidenceProcessor } from '../../modules/intelligence-core/application/services/evidence-processor.service.js';
import { ClassificationEngine } from '../../modules/intelligence-core/application/services/classification-engine.service.js';
import { TopicState } from '../../modules/intelligence-core/domain/entities/topic-state.entity.js';
import { KnowledgeState } from '../../modules/intelligence-core/domain/entities/knowledge-state.entity.js';
import { MetricSnapshot } from '../../modules/intelligence-core/domain/entities/metric-snapshot.entity.js';
import { TopicStateType, ModalityStateType, KnowledgeStateType, MetricCategory } from '../../modules/intelligence-core/domain/value-objects/intelligence-types.js';
import { LearningEvent } from '../../modules/adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningEvidence } from '../../modules/adaptive-learning/domain/entities/learning-evidence.entity.js';
import { LearningEventType, Modality, EvidenceType } from '../../modules/adaptive-learning/domain/value-objects/event-types.js';

describe('Adaptive Intelligence — TopicStateRepository', () => {
  let userId: string;
  let childId: string;
  let topicStateRepo: TopicStateRepository;

  beforeAll(async () => {
    topicStateRepo = new TopicStateRepository();
  });

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    const child = await createTestChild(userId);
    childId = child.id;
  });

  describe('CRUD operations', () => {
    it('should create a topic state', async () => {
      const topicId = crypto.randomUUID();
      const topicState = TopicState.create({
        childId,
        topicId,
        state: TopicStateType.NEW,
        modalityStates: {},
        enteredAt: new Date(),
        lastTransitionAt: new Date(),
        evidenceSummary: { initial: true },
      });

      const created = await topicStateRepo.create(topicState);

      expect(created).toBeInstanceOf(TopicState);
      expect(created.id).toBeDefined();
      expect(created.childId).toBe(childId);
      expect(created.topicId).toBe(topicId);
      expect(created.state).toBe(TopicStateType.NEW);
      expect(created.evidenceSummary).toBeDefined();
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it('should find a topic state by id', async () => {
      const topicId = crypto.randomUUID();
      const topicState = TopicState.create({
        childId,
        topicId,
        state: TopicStateType.LEARNING,
        modalityStates: { VIDEO: ModalityStateType.LEARNING },
        enteredAt: new Date(),
        lastTransitionAt: new Date(),
      });
      const created = await topicStateRepo.create(topicState);

      const found = await topicStateRepo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.state).toBe(TopicStateType.LEARNING);
    });

    it('should find a topic state by child and topic', async () => {
      const topicId = crypto.randomUUID();
      const topicState = TopicState.create({
        childId,
        topicId,
        state: TopicStateType.STABLE,
        modalityStates: { VIDEO: ModalityStateType.STABLE, AUDIO: ModalityStateType.STABLE },
        enteredAt: new Date(),
        lastTransitionAt: new Date(),
      });
      await topicStateRepo.create(topicState);

      const found = await topicStateRepo.findByChildAndTopic(childId, topicId);

      expect(found).not.toBeNull();
      expect(found!.childId).toBe(childId);
      expect(found!.topicId).toBe(topicId);
      expect(found!.state).toBe(TopicStateType.STABLE);
    });

    it('should return null when topic state not found by child and topic', async () => {
      const found = await topicStateRepo.findByChildAndTopic(childId, crypto.randomUUID());
      expect(found).toBeNull();
    });

    it('should find all topic states for a child', async () => {
      const topicId1 = crypto.randomUUID();
      const topicId2 = crypto.randomUUID();

      await topicStateRepo.create(TopicState.create({
        childId, topicId: topicId1, state: TopicStateType.NEW,
        modalityStates: {}, enteredAt: new Date(), lastTransitionAt: new Date(),
      }));
      await topicStateRepo.create(TopicState.create({
        childId, topicId: topicId2, state: TopicStateType.LEARNING,
        modalityStates: {}, enteredAt: new Date(), lastTransitionAt: new Date(),
      }));

      const states = await topicStateRepo.findByChildId(childId);

      expect(states).toHaveLength(2);
      expect(states.map(s => s.topicId)).toEqual(expect.arrayContaining([topicId1, topicId2]));
    });

    it('should update a topic state', async () => {
      const topicId = crypto.randomUUID();
      const created = await topicStateRepo.create(TopicState.create({
        childId, topicId, state: TopicStateType.NEW,
        modalityStates: {}, enteredAt: new Date(), lastTransitionAt: new Date(),
      }));

      const updated = created.transitionTo(
        TopicStateType.LEARNING,
        'Started learning',
        { eventType: 'observation' }
      );
      const result = await topicStateRepo.update(updated);

      expect(result.id).toBe(created.id);
      expect(result.state).toBe(TopicStateType.LEARNING);
      expect(result.transitionReason).toBe('Started learning');
      expect(result.lastTransitionAt.getTime()).toBeGreaterThanOrEqual(created.lastTransitionAt.getTime());
    });

    it('should persist modality states as JSON', async () => {
      const topicId = crypto.randomUUID();
      const modalityStates = {
        VIDEO: ModalityStateType.STABLE,
        AUDIO: ModalityStateType.LEARNING,
        SPEECH: ModalityStateType.NEEDS_PRACTICE,
      };

      const created = await topicStateRepo.create(TopicState.create({
        childId, topicId, state: TopicStateType.LEARNING,
        modalityStates, enteredAt: new Date(), lastTransitionAt: new Date(),
      }));

      const found = await topicStateRepo.findById(created.id);

      expect(found!.modalityStates).toEqual(modalityStates);
      expect(found!.modalityStates.VIDEO).toBe(ModalityStateType.STABLE);
      expect(found!.modalityStates.AUDIO).toBe(ModalityStateType.LEARNING);
      expect(found!.modalityStates.SPEECH).toBe(ModalityStateType.NEEDS_PRACTICE);
    });
  });
});

describe('Adaptive Intelligence — KnowledgeStateRepository', () => {
  let userId: string;
  let childId: string;
  let knowledgeStateRepo: KnowledgeStateRepository;

  beforeAll(async () => {
    knowledgeStateRepo = new KnowledgeStateRepository();
  });

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    const child = await createTestChild(userId);
    childId = child.id;
  });

  describe('CRUD operations', () => {
    it('should create a knowledge state', async () => {
      const topicId = crypto.randomUUID();
      const knowledgeState = KnowledgeState.create({
        childId,
        topicId,
        state: KnowledgeStateType.NEW,
        confidence: 0,
        modalityCoverage: {},
        enteredAt: new Date(),
        lastTransitionAt: new Date(),
      });

      const created = await knowledgeStateRepo.create(knowledgeState);

      expect(created).toBeInstanceOf(KnowledgeState);
      expect(created.id).toBeDefined();
      expect(created.childId).toBe(childId);
      expect(created.topicId).toBe(topicId);
      expect(created.state).toBe(KnowledgeStateType.NEW);
      expect(created.confidence).toBe(0);
    });

    it('should find a knowledge state by child and topic', async () => {
      const topicId = crypto.randomUUID();
      const knowledgeState = KnowledgeState.create({
        childId, topicId, state: KnowledgeStateType.LEARNING, confidence: 0.5,
        modalityCoverage: { VIDEO: ModalityStateType.LEARNING },
        enteredAt: new Date(), lastTransitionAt: new Date(),
      });
      await knowledgeStateRepo.create(knowledgeState);

      const found = await knowledgeStateRepo.findByChildAndTopic(childId, topicId);

      expect(found).not.toBeNull();
      expect(found!.childId).toBe(childId);
      expect(found!.topicId).toBe(topicId);
      expect(found!.state).toBe(KnowledgeStateType.LEARNING);
      expect(found!.confidence).toBe(0.5);
    });

    it('should return null when knowledge state not found', async () => {
      const found = await knowledgeStateRepo.findByChildAndTopic(childId, crypto.randomUUID());
      expect(found).toBeNull();
    });

    it('should find all knowledge states for a child', async () => {
      const topicId1 = crypto.randomUUID();
      const topicId2 = crypto.randomUUID();

      await knowledgeStateRepo.create(KnowledgeState.create({
        childId, topicId: topicId1, state: KnowledgeStateType.STABLE, confidence: 0.8,
        modalityCoverage: {}, enteredAt: new Date(), lastTransitionAt: new Date(),
      }));
      await knowledgeStateRepo.create(KnowledgeState.create({
        childId, topicId: topicId2, state: KnowledgeStateType.NEEDS_PRACTICE, confidence: 0.3,
        modalityCoverage: {}, enteredAt: new Date(), lastTransitionAt: new Date(),
      }));

      const states = await knowledgeStateRepo.findByChildId(childId);

      expect(states).toHaveLength(2);
    });

    it('should update a knowledge state', async () => {
      const topicId = crypto.randomUUID();
      const created = await knowledgeStateRepo.create(KnowledgeState.create({
        childId, topicId, state: KnowledgeStateType.NEW, confidence: 0,
        modalityCoverage: {}, enteredAt: new Date(), lastTransitionAt: new Date(),
      }));

      const updated = created.transitionTo(KnowledgeStateType.LEARNING, 0.6, 'Started showing progress');
      const result = await knowledgeStateRepo.update(updated);

      expect(result.id).toBe(created.id);
      expect(result.state).toBe(KnowledgeStateType.LEARNING);
      expect(result.confidence).toBe(0.6);
      expect(result.transitionReason).toBe('Started showing progress');
    });

    it('should persist modality coverage as JSON', async () => {
      const topicId = crypto.randomUUID();
      const modalityCoverage = {
        VIDEO: ModalityStateType.MASTERED,
        AUDIO: ModalityStateType.STABLE,
        SPEECH: ModalityStateType.LEARNING,
        WRITING: ModalityStateType.NEEDS_PRACTICE,
      };

      const created = await knowledgeStateRepo.create(KnowledgeState.create({
        childId, topicId, state: KnowledgeStateType.LEARNING, confidence: 0.5,
        modalityCoverage, enteredAt: new Date(), lastTransitionAt: new Date(),
      }));

      const found = await knowledgeStateRepo.findByChildAndTopic(childId, topicId);

      expect(found!.modalityCoverage).toEqual(modalityCoverage);
    });
  });
});

describe('Adaptive Intelligence — ObservationEngine', () => {
  let userId: string;
  let childId: string;
  let topicStateRepo: TopicStateRepository;
  let engine: ObservationEngine;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    const child = await createTestChild(userId);
    childId = child.id;
    topicStateRepo = new TopicStateRepository();
    engine = new ObservationEngine(topicStateRepo);
  });

  describe('create topic states', () => {
    it('should create a NEW topic state on first observation', async () => {
      const topicId = crypto.randomUUID();
      const event: ObservationEventInput = {
        childId,
        eventType: 'ACTIVITY_COMPLETED',
        sessionId: crypto.randomUUID(),
        topicId,
        activityId: crypto.randomUUID(),
        modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 100, attempts: 1 },
      };

      const result = await engine.observe(event);

      expect(result.topicState).toBeInstanceOf(TopicState);
      expect(result.topicState.childId).toBe(childId);
      expect(result.topicState.topicId).toBe(topicId);
      expect(result.topicState.state).toBe(TopicStateType.LEARNING);
      expect(result.evidenceCreated).toBe(true);

      const persisted = await topicStateRepo.findByChildAndTopic(childId, topicId);
      expect(persisted).not.toBeNull();
      expect(persisted!.state).toBe(TopicStateType.LEARNING);
    });

    it('should reuse existing topic state on subsequent observations', async () => {
      const topicId = crypto.randomUUID();

      const event1: ObservationEventInput = {
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 100, attempts: 1 },
      };
      await engine.observe(event1);

      const event2: ObservationEventInput = {
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 50, attempts: 2 },
      };
      const result = await engine.observe(event2);

      expect(result.topicState.childId).toBe(childId);
      expect(result.topicState.topicId).toBe(topicId);
    });
  });

  describe('topic state transitions', () => {
    it('should transition from NEW to LEARNING on completed event', async () => {
      const topicId = crypto.randomUUID();
      const event: ObservationEventInput = {
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 50, attempts: 1 },
      };

      const result = await engine.observe(event);

      expect(result.topicState.state).toBe(TopicStateType.LEARNING);
    });

    it('should transition from LEARNING to STABLE with high accuracy and sufficient attempts', async () => {
      const topicId = crypto.randomUUID();

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 50, attempts: 1 },
      });

      const result = await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 85, attempts: 3 },
      });

      expect(result.topicState.state).toBe(TopicStateType.STABLE);
    });

    it('should transition from LEARNING to NEEDS_PRACTICE with low accuracy and high retries', async () => {
      const topicId = crypto.randomUUID();

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 50, attempts: 1 },
      });

      const result = await engine.observe({
        childId, eventType: 'ACTIVITY_FAILED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: false, accuracy: 40, attempts: 1, retries: 4 },
      });

      expect(result.topicState.state).toBe(TopicStateType.NEEDS_PRACTICE);
    });

    it('should transition from NEEDS_PRACTICE back to LEARNING with improved accuracy', async () => {
      const topicId = crypto.randomUUID();

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 50, attempts: 1 },
      });

      await engine.observe({
        childId, eventType: 'ACTIVITY_FAILED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: false, accuracy: 40, attempts: 1, retries: 4 },
      });

      const result = await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 80, attempts: 3 },
      });

      expect(result.topicState.state).toBe(TopicStateType.LEARNING);
    });

    it('should transition from STABLE to REINFORCEMENT with high accuracy and attempts', async () => {
      const topicId = crypto.randomUUID();

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 50, attempts: 1 },
      });

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 90, attempts: 4 },
      });

      const result = await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 95, attempts: 6 },
      });

      expect(result.topicState.state).toBe(TopicStateType.REINFORCEMENT);
    });

    it('should transition from STABLE to NEEDS_PRACTICE when accuracy drops below 70', async () => {
      const topicId = crypto.randomUUID();

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 50, attempts: 1 },
      });

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 90, attempts: 4 },
      });

      const result = await engine.observe({
        childId, eventType: 'ACTIVITY_FAILED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: false, accuracy: 50, attempts: 2 },
      });

      expect(result.topicState.state).toBe(TopicStateType.NEEDS_PRACTICE);
    });

    it('should transition from REINFORCEMENT to MASTERED with sustained high accuracy', async () => {
      const topicId = crypto.randomUUID();

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 50, attempts: 1 },
      });

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 90, attempts: 4 },
      });

      await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 95, attempts: 6 },
      });

      const result = await engine.observe({
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: crypto.randomUUID(),
        topicId, activityId: crypto.randomUUID(), modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 90, attempts: 5 },
      });

      expect(result.topicState.state).toBe(TopicStateType.MASTERED);
    });
  });

  describe('evidence integration', () => {
    it('should generate evidence summary in topic state', async () => {
      const topicId = crypto.randomUUID();
      const event: ObservationEventInput = {
        childId, eventType: 'ACTIVITY_COMPLETED', sessionId: 'session-1',
        topicId, activityId: 'activity-1', modality: 'VIDEO' as any,
        payload: { completed: true, accuracy: 85, attempts: 3, retries: 1, duration: 120, hintsUsed: 0 },
      };

      await engine.observe(event);

      const persisted = await topicStateRepo.findByChildAndTopic(childId, topicId);
      expect(persisted!.evidenceSummary).toBeDefined();
      expect(persisted!.evidenceSummary!.eventType).toBe('ACTIVITY_COMPLETED');
      expect(persisted!.evidenceSummary!.sessionId).toBe('session-1');
      expect(persisted!.evidenceSummary!.activityId).toBe('activity-1');
      expect(persisted!.evidenceSummary!.accuracy).toBe(85);
      expect(persisted!.evidenceSummary!.timestamp).toBeDefined();
    });
  });
});

describe('Adaptive Intelligence — ClassificationEngine', () => {
  let userId: string;
  let childId: string;
  let topicStateRepo: TopicStateRepository;
  let knowledgeStateRepo: KnowledgeStateRepository;
  let engine: ClassificationEngine;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    const child = await createTestChild(userId);
    childId = child.id;
    topicStateRepo = new TopicStateRepository();
    knowledgeStateRepo = new KnowledgeStateRepository();
    engine = new ClassificationEngine(topicStateRepo, knowledgeStateRepo);
  });

  function makeTopicMetric(topicId: string, overrides: Record<string, unknown> = {}): MetricSnapshot {
    const now = new Date();
    return MetricSnapshot.create({
      childId,
      category: MetricCategory.TOPIC,
      metrics: {
        topicId,
        avgAccuracy: 0,
        avgDuration: 0,
        completionRate: 0,
        eventCount: 1,
        ...overrides,
      },
      calculationVersion: '1.0',
      windowStart: new Date(now.getTime() - 86400000),
      windowEnd: now,
    });
  }

  describe('knowledge state updates with evidence', () => {
    it('should create a knowledge state when classifying topics', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, { videoCompletionRate: 0.95, audioCompletionRate: 0.8 });

      const result = await engine.classifyAll(childId, [snapshot]);

      expect(result.topicStates).toHaveLength(1);
      expect(result.knowledgeStates).toHaveLength(1);
      expect(result.topicStates[0].topicId).toBe(topicId);
      expect(result.knowledgeStates[0].topicId).toBe(topicId);
    });

    it('should update existing knowledge state on reclassification', async () => {
      const topicId = crypto.randomUUID();
      const snapshot1 = makeTopicMetric(topicId, { videoCompletionRate: 0.95, audioCompletionRate: 0.8 });

      await engine.classifyAll(childId, [snapshot1]);

      const snapshot2 = makeTopicMetric(topicId, { videoCompletionRate: 0.98, audioCompletionRate: 0.95, speechAccuracy: 0.9, writingAccuracy: 0.85 });
      const result = await engine.classifyAll(childId, [snapshot2]);

      expect(result.knowledgeStates).toHaveLength(1);
    });
  });

  describe('high mastery scenario', () => {
    it('should classify topic as MASTERED when all modalities are mastered', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.95,
        audioCompletionRate: 0.92,
        speechAccuracy: 0.9,
        writingAccuracy: 0.88,
      });

      const result = await engine.classifyAll(childId, [snapshot]);

      expect(result.topicStates[0].state).toBe(TopicStateType.MASTERED);
      expect(result.knowledgeStates[0].state).toBe(KnowledgeStateType.MASTERED);
    });

    it('should derive high confidence for mastered state', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.95,
        audioCompletionRate: 0.92,
        speechAccuracy: 0.9,
        writingAccuracy: 0.88,
      });

      const result = await engine.classifyAll(childId, [snapshot]);
      const ks = result.knowledgeStates[0];

      expect(ks.confidence).toBeGreaterThan(0.9);
    });

    it('should classify topic as STABLE when all stable and no mastered', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.75,
        audioCompletionRate: 0.72,
        speechAccuracy: 0.7,
        writingAccuracy: 0.68,
      });

      const result = await engine.classifyAll(childId, [snapshot]);

      expect(result.topicStates[0].state).toBe(TopicStateType.STABLE);
    });
  });

  describe('low mastery scenario', () => {
    it('should classify topic as NEEDS_PRACTICE when modalities are low', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.3,
        audioCompletionRate: 0.25,
        speechAccuracy: 0.4,
        writingAccuracy: 0.35,
      });

      const result = await engine.classifyAll(childId, [snapshot]);

      expect(result.topicStates[0].state).toBe(TopicStateType.NEEDS_PRACTICE);
      expect(result.knowledgeStates[0].state).toBe(KnowledgeStateType.NEEDS_PRACTICE);
    });

    it('should derive low confidence for needs-practice state', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.3,
        audioCompletionRate: 0.25,
      });

      const result = await engine.classifyAll(childId, [snapshot]);
      const ks = result.knowledgeStates[0];

      expect(ks.confidence).toBeLessThan(0.5);
    });

    it('should classify topic as LEARNING when modalities are intermediate', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.55,
        audioCompletionRate: 0.45,
      });

      const result = await engine.classifyAll(childId, [snapshot]);

      expect(result.topicStates[0].state).toBe(TopicStateType.LEARNING);
    });
  });

  describe('state persistence in database', () => {
    it('should persist topic state after classification', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.95,
        audioCompletionRate: 0.92,
        speechAccuracy: 0.9,
        writingAccuracy: 0.88,
      });

      await engine.classifyAll(childId, [snapshot]);

      const persisted = await topicStateRepo.findByChildAndTopic(childId, topicId);
      expect(persisted).not.toBeNull();
      expect(persisted!.state).toBe(TopicStateType.MASTERED);
      expect(persisted!.modalityStates.VIDEO).toBe(ModalityStateType.MASTERED);
      expect(persisted!.modalityStates.AUDIO).toBe(ModalityStateType.MASTERED);
      expect(persisted!.modalityStates.SPEECH).toBe(ModalityStateType.MASTERED);
      expect(persisted!.modalityStates.WRITING).toBe(ModalityStateType.MASTERED);
    });

    it('should persist knowledge state after classification', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.95,
        audioCompletionRate: 0.92,
        speechAccuracy: 0.9,
        writingAccuracy: 0.88,
      });

      await engine.classifyAll(childId, [snapshot]);

      const persisted = await knowledgeStateRepo.findByChildAndTopic(childId, topicId);
      expect(persisted).not.toBeNull();
      expect(persisted!.state).toBe(KnowledgeStateType.MASTERED);
      expect(persisted!.confidence).toBeGreaterThan(0.9);
    });

    it('should update existing topic state in database on reclassification', async () => {
      const topicId = crypto.randomUUID();

      const lowSnapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.3,
        audioCompletionRate: 0.25,
      });
      await engine.classifyAll(childId, [lowSnapshot]);

      const highSnapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.95,
        audioCompletionRate: 0.92,
        speechAccuracy: 0.9,
        writingAccuracy: 0.88,
      });
      const result = await engine.classifyAll(childId, [highSnapshot]);

      expect(result.topicStates[0].state).toBe(TopicStateType.MASTERED);

      const persisted = await topicStateRepo.findByChildAndTopic(childId, topicId);
      expect(persisted!.state).toBe(TopicStateType.MASTERED);
    });

    it('should track transition reason in persisted state', async () => {
      const topicId = crypto.randomUUID();
      const snapshot = makeTopicMetric(topicId, {
        videoCompletionRate: 0.95,
        audioCompletionRate: 0.92,
      });

      await engine.classifyAll(childId, [snapshot]);

      const persisted = await topicStateRepo.findByChildAndTopic(childId, topicId);
      expect(persisted!.transitionReason).toBeDefined();
      expect(persisted!.transitionReason).toContain('Classified based on modality states');
    });

    it('should persist correct number of states for multiple topics', async () => {
      const topicId1 = crypto.randomUUID();
      const topicId2 = crypto.randomUUID();

      const snapshot1 = makeTopicMetric(topicId1, { videoCompletionRate: 0.95, audioCompletionRate: 0.9 });
      const snapshot2 = makeTopicMetric(topicId2, { videoCompletionRate: 0.3, audioCompletionRate: 0.25 });

      await engine.classifyAll(childId, [snapshot1, snapshot2]);

      const allTopicStates = await topicStateRepo.findByChildId(childId);
      const allKnowledgeStates = await knowledgeStateRepo.findByChildId(childId);

      expect(allTopicStates).toHaveLength(2);
      expect(allKnowledgeStates).toHaveLength(2);
    });
  });
});

describe('Adaptive Intelligence — EvidenceProcessor', () => {
  let userId: string;
  let childId: string;
  let processor: EvidenceProcessor;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    const child = await createTestChild(userId);
    childId = child.id;
    processor = new EvidenceProcessor();
  });

  function makeEvent(overrides: Partial<{
    eventType: LearningEventType;
    sessionId: string;
    topicId: string;
    activityId: string;
    modality: Modality;
    payload: Record<string, unknown>;
    duration: number;
    timestamp: Date;
  }> = {}): LearningEvent {
    return LearningEvent.create({
      childId,
      eventType: LearningEventType.ACTIVITY_COMPLETED,
      eventVersion: 1,
      sessionId: crypto.randomUUID(),
      timestamp: new Date(),
      ...overrides,
    });
  }

  function makeEvidence(overrides: Partial<{
    eventId: string;
    sessionId: string;
    topicId: string;
    modality: Modality;
    evidenceType: EvidenceType;
    observation: Record<string, unknown>;
  }> = {}): LearningEvidence {
    return LearningEvidence.create({
      eventId: crypto.randomUUID(),
      childId,
      sessionId: crypto.randomUUID(),
      evidenceType: EvidenceType.ACCURACY,
      observation: {},
      ...overrides,
    });
  }

  describe('metrics calculation', () => {
    it('should calculate performance metrics from events', async () => {
      const events = [
        makeEvent({
          eventType: LearningEventType.ACTIVITY_STARTED,
          payload: { accuracy: 0, attempts: 0 },
        }),
        makeEvent({
          eventType: LearningEventType.ACTIVITY_COMPLETED,
          payload: { accuracy: 85, attempts: 3, retries: 1 },
        }),
        makeEvent({
          eventType: LearningEventType.ACTIVITY_COMPLETED,
          payload: { accuracy: 90, attempts: 2, retries: 0 },
        }),
      ];

      const snapshots = await processor.processEvidence(childId, events, []);

      const perfSnapshot = snapshots.find(s => s.category === MetricCategory.PERFORMANCE);
      expect(perfSnapshot).toBeDefined();
      expect(perfSnapshot!.metrics.avgAccuracy).toBe(87.5);
      expect(perfSnapshot!.metrics.avgAttempts).toBe(2.5);
      expect(perfSnapshot!.metrics.avgRetries).toBe(0.5);
      expect(perfSnapshot!.metrics.completionRate).toBeCloseTo(2 / 3, 5);
      expect(perfSnapshot!.metrics.successRate).toBe(1);
    });

    it('should calculate modality-specific metrics', async () => {
      const events = [
        makeEvent({
          eventType: LearningEventType.ACTIVITY_STARTED,
          modality: Modality.VIDEO,
          payload: { accuracy: 0, attempts: 0 },
        }),
        makeEvent({
          eventType: LearningEventType.ACTIVITY_COMPLETED,
          modality: Modality.VIDEO,
          payload: { accuracy: 80, attempts: 3, retries: 2 },
        }),
        makeEvent({
          eventType: LearningEventType.ACTIVITY_STARTED,
          modality: Modality.AUDIO,
          payload: { accuracy: 0, attempts: 0 },
        }),
        makeEvent({
          eventType: LearningEventType.ACTIVITY_COMPLETED,
          modality: Modality.AUDIO,
          payload: { accuracy: 95, attempts: 2, retries: 0 },
        }),
      ];

      const snapshots = await processor.processEvidence(childId, events, []);

      const modalitySnapshots = snapshots.filter(s => s.category === MetricCategory.MODALITY);
      expect(modalitySnapshots).toHaveLength(2);

      const videoSnap = modalitySnapshots.find(s => s.metrics.modality === 'VIDEO');
      expect(videoSnap!.metrics.avgAccuracy).toBe(80);
      expect(videoSnap!.metrics.totalEvents).toBe(2);

      const audioSnap = modalitySnapshots.find(s => s.metrics.modality === 'AUDIO');
      expect(audioSnap!.metrics.avgAccuracy).toBe(95);
      expect(audioSnap!.metrics.totalEvents).toBe(2);
    });

    it('should calculate topic-specific metrics', async () => {
      const topicId = crypto.randomUUID();
      const events = [
        makeEvent({
          eventType: LearningEventType.ACTIVITY_STARTED,
          topicId,
          payload: { accuracy: 0, attempts: 0 },
        }),
        makeEvent({
          eventType: LearningEventType.ACTIVITY_COMPLETED,
          topicId,
          duration: 30000,
          payload: { accuracy: 85, attempts: 3 },
        }),
      ];

      const snapshots = await processor.processEvidence(childId, events, []);

      const topicSnapshot = snapshots.find(s => s.category === MetricCategory.TOPIC);
      expect(topicSnapshot).toBeDefined();
      expect(topicSnapshot!.metrics.topicId).toBe(topicId);
      expect(topicSnapshot!.metrics.avgAccuracy).toBe(85);
      expect(topicSnapshot!.metrics.eventCount).toBe(2);
      expect(topicSnapshot!.metrics.completionRate).toBe(0.5);
    });

    it('should calculate session metrics', async () => {
      const sessionId = crypto.randomUUID();
      const events = [
        makeEvent({
          eventType: LearningEventType.SESSION_STARTED,
          sessionId,
          timestamp: new Date(Date.now() - 60000),
        }),
        makeEvent({
          eventType: LearningEventType.ACTIVITY_COMPLETED,
          sessionId,
          payload: { accuracy: 80, attempts: 2 },
        }),
        makeEvent({
          eventType: LearningEventType.SESSION_COMPLETED,
          sessionId,
          timestamp: new Date(),
        }),
      ];

      const snapshots = await processor.processEvidence(childId, events, []);

      const sessionSnapshot = snapshots.find(s => s.category === MetricCategory.SESSION);
      expect(sessionSnapshot).toBeDefined();
      expect(sessionSnapshot!.metrics.totalSessions).toBe(1);
      expect(sessionSnapshot!.metrics.completionRate).toBe(1);
      expect(sessionSnapshot!.metrics.avgEventsPerSession).toBe(3);
    });

    it('should calculate retention metrics', async () => {
      const topicId = crypto.randomUUID();
      const events = [
        makeEvent({
          eventType: LearningEventType.REINFORCEMENT_COMPLETED,
          topicId,
          payload: { accuracy: 85 },
        }),
        makeEvent({
          eventType: LearningEventType.DAILY_PRACTICE_COMPLETED,
          topicId,
          payload: { accuracy: 90 },
        }),
      ];

      const snapshots = await processor.processEvidence(childId, events, []);

      const retentionSnapshot = snapshots.find(s => s.category === MetricCategory.RETENTION);
      expect(retentionSnapshot).toBeDefined();
      expect(retentionSnapshot!.metrics.reviewSuccessRate).toBe(1);
      expect(retentionSnapshot!.metrics.topicsTracked).toBe(1);
    });
  });
});
