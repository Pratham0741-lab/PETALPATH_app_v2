import { jest } from '@jest/globals';
import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestUser, createTestChild, createTestLearningEventData } from '../helpers/factories.js';
import '../helpers/setup.js';

import { EvidenceValidationService } from '../../modules/evidence-processing/application/services/evidence-validation.service.js';
import { EvidenceAggregationService } from '../../modules/evidence-processing/application/services/evidence-aggregation.service.js';
import { ProcessingResultBuilder } from '../../modules/evidence-processing/application/services/processing-result-builder.service.js';
import { EvidenceProcessingPipeline } from '../../modules/evidence-processing/application/services/evidence-processing-pipeline.service.js';
import { EvidenceType } from '../../modules/evidence-processing/domain/value-objects/evidence-type.js';
import { EvidenceScore } from '../../modules/evidence-processing/domain/value-objects/evidence-score.js';
import { ProcessingStatus } from '../../modules/evidence-processing/domain/value-objects/processing-status.js';
import { ProcessingError } from '../../modules/evidence-processing/domain/value-objects/processing-error.js';
import { PerformanceSnapshot } from '../../modules/evidence-processing/domain/value-objects/performance-snapshot.js';
import { EvidenceRecord } from '../../modules/evidence-processing/domain/entities/evidence-record.entity.js';
import { MissingFieldError, ValidationError } from '../../modules/evidence-processing/domain/errors.js';
import { LearningEvent } from '../../modules/adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningEventType } from '../../modules/adaptive-learning/domain/value-objects/event-types.js';

describe('Evidence Processing Module', () => {
  let userId: string;
  let childId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    const child = await createTestChild(userId);
    childId = child.id;
  });

  describe('EvidenceValidationService', () => {
    const validator = new EvidenceValidationService();

    it('should accept a valid learning event', () => {
      const event = LearningEvent.create({
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
      });

      expect(() => validator.validateEvent(event)).not.toThrow();
    });

    it('should throw MissingFieldError when childId is empty', () => {
      const event = new LearningEvent({
        eventId: crypto.randomUUID(),
        childId: '',
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(() => validator.validateEvent(event)).toThrow(MissingFieldError);
    });

    it('should throw MissingFieldError when eventType is empty', () => {
      const event = new LearningEvent({
        eventId: crypto.randomUUID(),
        childId,
        eventType: '' as LearningEventType,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(() => validator.validateEvent(event)).toThrow(MissingFieldError);
    });

    it('should throw MissingFieldError when topicId is missing', () => {
      const event = new LearningEvent({
        eventId: crypto.randomUUID(),
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: undefined,
        timestamp: new Date(),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(() => validator.validateEvent(event)).toThrow(MissingFieldError);
    });

    it('should throw ValidationError for unknown event type', () => {
      const event = new LearningEvent({
        eventId: crypto.randomUUID(),
        childId,
        eventType: 'UNKNOWN_EVENT' as LearningEventType,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(() => validator.validateEvent(event)).toThrow(ValidationError);
    });
  });

  describe('EvidenceAggregationService', () => {
    const aggregator = new EvidenceAggregationService();

    it('should create COMPLETION evidence for a completed activity', () => {
      const event = LearningEvent.create({
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
      });

      const records = aggregator.aggregate(event);

      expect(records.length).toBeGreaterThanOrEqual(1);
      const completion = records.find(r => r.evidenceType === EvidenceType.COMPLETION);
      expect(completion).toBeDefined();
      expect(completion!.childId).toBe(childId);
      expect(completion!.topicId).toBe('test-topic');
      expect(completion!.score.score).toBe(1);
    });

    it('should mark COMPLETION evidence with score 0 for incorrect events', () => {
      const event = new LearningEvent({
        eventId: crypto.randomUUID(),
        childId,
        eventType: LearningEventType.ACTIVITY_FAILED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
        payload: { correct: false },
        idempotencyKey: crypto.randomUUID(),
      });

      const records = aggregator.aggregate(event);

      const completion = records.find(r => r.evidenceType === EvidenceType.COMPLETION);
      expect(completion).toBeDefined();
      expect(completion!.score.score).toBe(0);
    });

    it('should create SPEED evidence when duration is present', () => {
      const event = LearningEvent.create({
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
        duration: 5000,
      });

      const records = aggregator.aggregate(event);

      const speed = records.find(r => r.evidenceType === EvidenceType.SPEED);
      expect(speed).toBeDefined();
      expect(speed!.score.score).toBeGreaterThan(0);
      expect(speed!.metadata.durationMs).toBe(5000);
    });

    it('should not create SPEED evidence when duration is absent', () => {
      const event = LearningEvent.create({
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
      });

      const records = aggregator.aggregate(event);

      const speed = records.find(r => r.evidenceType === EvidenceType.SPEED);
      expect(speed).toBeUndefined();
    });

    it('should create ATTEMPT evidence when attempt info is present', () => {
      const event = new LearningEvent({
        eventId: crypto.randomUUID(),
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
        payload: { correct: true, attemptCount: 3, hintUsed: false },
        idempotencyKey: crypto.randomUUID(),
      });

      const records = aggregator.aggregate(event);

      const attempt = records.find(r => r.evidenceType === EvidenceType.ATTEMPT);
      expect(attempt).toBeDefined();
      expect(attempt!.metadata.correct).toBe(true);
      expect(attempt!.metadata.attemptCount).toBe(3);
    });

    it('should not create ATTEMPT evidence when no attempt info exists', () => {
      const event = new LearningEvent({
        eventId: crypto.randomUUID(),
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
        idempotencyKey: crypto.randomUUID(),
      });

      const records = aggregator.aggregate(event);

      const attempt = records.find(r => r.evidenceType === EvidenceType.ATTEMPT);
      expect(attempt).toBeUndefined();
    });
  });

  describe('ProcessingResultBuilder', () => {
    it('should build a COMPLETED result when there are no errors', () => {
      const records = [
        EvidenceRecord.create({
          eventId: 'evt-1',
          childId,
          topicId: 'topic-1',
          sessionId: 'session-1',
          evidenceType: EvidenceType.COMPLETION,
          score: new EvidenceScore(1, 0.8),
          metadata: {},
          timestamp: new Date(),
        }),
      ];

      const result = new ProcessingResultBuilder()
        .withEventId('evt-1')
        .withRecords(records)
        .build();

      expect(result.status).toBe(ProcessingStatus.COMPLETED);
      expect(result.eventId).toBe('evt-1');
      expect(result.hasErrors).toBe(false);
      expect(result.summary.totalRecords).toBe(1);
      expect(result.summary.successfulRecords).toBe(1);
      expect(result.summary.failedRecords).toBe(0);
    });

    it('should build a FAILED result when all records have errors', () => {
      const records = [
        EvidenceRecord.create({
          eventId: 'evt-1',
          childId,
          topicId: 'topic-1',
          sessionId: 'session-1',
          evidenceType: EvidenceType.COMPLETION,
          score: new EvidenceScore(0, 0),
          metadata: {},
          timestamp: new Date(),
        }),
      ];

      const result = new ProcessingResultBuilder()
        .withEventId('evt-1')
        .withRecords(records)
        .withError(new ProcessingError('TEST_ERR', 'Test error'))
        .build();

      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.hasErrors).toBe(true);
      expect(result.summary.totalRecords).toBe(1);
      expect(result.summary.failedRecords).toBe(1);
      expect(result.summary.successfulRecords).toBe(0);
    });

    it('should build a PARTIALLY_COMPLETED result when there are some successes and errors', () => {
      const records = [
        EvidenceRecord.create({
          eventId: 'evt-1',
          childId,
          topicId: 'topic-1',
          sessionId: 'session-1',
          evidenceType: EvidenceType.COMPLETION,
          score: new EvidenceScore(1, 0.8),
          metadata: {},
          timestamp: new Date(),
        }),
      ];

      const result = new ProcessingResultBuilder()
        .withEventId('evt-1')
        .withRecords(records)
        .withError(new ProcessingError('PARTIAL_ERR', 'Partial error'))
        .build();

      expect(result.status).toBe(ProcessingStatus.PARTIALLY_COMPLETED);
      expect(result.summary.failedRecords).toBe(1);
    });

    it('should count debt and reinforcement updates in the summary', () => {
      const result = new ProcessingResultBuilder()
        .withEventId('evt-1')
        .withRecords([])
        .withDebtUpdates([
          { debtId: 'd1', topicId: 't1', action: 'CREATED', severity: 0.7 },
          { debtId: 'd2', topicId: 't1', action: 'RESOLVED', severity: 0 },
        ])
        .withReinforcementUpdates([
          { topicId: 't1', action: 'ENQUEUED', priority: 50 },
          { topicId: 't2', action: 'COMPLETED', priority: 30 },
        ])
        .build();

      expect(result.summary.debtsCreated).toBe(1);
      expect(result.summary.debtsResolved).toBe(1);
      expect(result.summary.queueEnqueued).toBe(1);
      expect(result.summary.queueUpdated).toBe(1);
    });

    it('should include performance snapshot data in the summary', () => {
      const snapshot = new PerformanceSnapshot({
        mastery: 75,
        confidence: 60,
        difficulty: 'MEDIUM',
        currentModality: 'VIDEO',
      });

      const result = new ProcessingResultBuilder()
        .withEventId('evt-1')
        .withRecords([])
        .withPerformanceSnapshot(snapshot)
        .build();

      expect(result.performanceSnapshot).not.toBeNull();
      expect(result.performanceSnapshot!.mastery).toBe(75);
      expect(result.performanceSnapshot!.confidence).toBe(60);
      expect(result.summary.masteryDelta).toBe(75);
      expect(result.summary.confidenceDelta).toBe(60);
    });
  });

  describe('EvidenceProcessingPipeline', () => {
    it('should execute all pipeline steps and return a completed result', async () => {
      const mockValidator = { validateEvent: jest.fn() };
      const mockRecords = [
        EvidenceRecord.create({
          eventId: 'evt-1',
          childId,
          topicId: 'topic-1',
          sessionId: 'session-1',
          evidenceType: EvidenceType.COMPLETION,
          score: new EvidenceScore(1, 0.8),
          metadata: {},
          timestamp: new Date(),
        }),
      ];
      const mockAggregator = { aggregate: jest.fn().mockReturnValue(mockRecords) };
      const mockStateResult = {
        state: { mastery: 70, confidence: 60, currentDifficulty: 'MEDIUM', currentModality: 'VIDEO' },
        snapshot: new PerformanceSnapshot({ mastery: 70, confidence: 60, difficulty: 'MEDIUM', currentModality: 'VIDEO' }),
      };
      const mockStateProcessor = { process: jest.fn(async (_input: unknown) => mockStateResult) };
      const mockDebtUpdates = [{ debtId: 'd1', topicId: 't1', action: 'CREATED' as const, severity: 0.7 }];
      const mockDebtProcessor = { process: jest.fn(async (_input: unknown) => mockDebtUpdates) };
      const mockReinforcementUpdates = [{ topicId: 't1', action: 'ENQUEUED' as const, priority: 50 }];
      const mockReinforcementProcessor = { process: jest.fn(async (_input: unknown) => mockReinforcementUpdates) };

      const pipeline = new EvidenceProcessingPipeline(
        mockValidator as unknown as EvidenceValidationService,
        mockAggregator as unknown as EvidenceAggregationService,
        mockStateProcessor as unknown as import('../../modules/evidence-processing/application/services/learning-state-processor.service.js').LearningStateProcessor,
        mockDebtProcessor as unknown as import('../../modules/evidence-processing/application/services/learning-debt-processor.service.js').LearningDebtProcessor,
        mockReinforcementProcessor as unknown as import('../../modules/evidence-processing/application/services/reinforcement-processor.service.js').ReinforcementProcessor,
      );

      const event = LearningEvent.create({
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
      });

      const result = await pipeline.processEvent(event);

      expect(mockValidator.validateEvent).toHaveBeenCalledWith(event);
      expect(mockAggregator.aggregate).toHaveBeenCalledWith(event);
      expect(mockStateProcessor.process).toHaveBeenCalledWith(event);
      expect(mockDebtProcessor.process).toHaveBeenCalledWith(event, mockRecords);
      expect(mockReinforcementProcessor.process).toHaveBeenCalledWith(event, mockRecords, mockStateResult.state);
      expect(result.status).toBe(ProcessingStatus.COMPLETED);
      expect(result.summary.totalRecords).toBe(1);
    });

    it('should return a FAILED result when validation fails', async () => {
      const mockValidator = {
        validateEvent: jest.fn().mockImplementation(() => { throw new MissingFieldError('childId'); }),
      };
      const mockAggregator = { aggregate: jest.fn() };
      const mockStateProcessor = { process: jest.fn() };
      const mockDebtProcessor = { process: jest.fn() };
      const mockReinforcementProcessor = { process: jest.fn() };

      const pipeline = new EvidenceProcessingPipeline(
        mockValidator as unknown as EvidenceValidationService,
        mockAggregator as unknown as EvidenceAggregationService,
        mockStateProcessor as unknown as import('../../modules/evidence-processing/application/services/learning-state-processor.service.js').LearningStateProcessor,
        mockDebtProcessor as unknown as import('../../modules/evidence-processing/application/services/learning-debt-processor.service.js').LearningDebtProcessor,
        mockReinforcementProcessor as unknown as import('../../modules/evidence-processing/application/services/reinforcement-processor.service.js').ReinforcementProcessor,
      );

      const event = LearningEvent.create({
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
      });

      const result = await pipeline.processEvent(event);

      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.hasErrors).toBe(true);
      expect(result.errors[0].code).toBe('PIPELINE_FAILED');
      expect(mockAggregator.aggregate).not.toHaveBeenCalled();
    });

    it('should capture and wrap errors from downstream processors', async () => {
      const mockValidator = { validateEvent: jest.fn() };
      const mockAggregator = { aggregate: jest.fn().mockReturnValue([]) };
      const mockStateProcessor = { process: jest.fn(async (_input: unknown) => { throw new Error('State update failed'); }) };
      const mockDebtProcessor = { process: jest.fn() };
      const mockReinforcementProcessor = { process: jest.fn() };

      const pipeline = new EvidenceProcessingPipeline(
        mockValidator as unknown as EvidenceValidationService,
        mockAggregator as unknown as EvidenceAggregationService,
        mockStateProcessor as unknown as import('../../modules/evidence-processing/application/services/learning-state-processor.service.js').LearningStateProcessor,
        mockDebtProcessor as unknown as import('../../modules/evidence-processing/application/services/learning-debt-processor.service.js').LearningDebtProcessor,
        mockReinforcementProcessor as unknown as import('../../modules/evidence-processing/application/services/reinforcement-processor.service.js').ReinforcementProcessor,
      );

      const event = LearningEvent.create({
        childId,
        eventType: LearningEventType.ACTIVITY_COMPLETED,
        eventVersion: 1,
        sessionId: crypto.randomUUID(),
        topicId: 'test-topic',
        timestamp: new Date(),
      });

      const result = await pipeline.processEvent(event);

      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.hasErrors).toBe(true);
      expect(result.errors[0].message).toContain('State update failed');
    });
  });

  function createEventInDb(childId: string) {
    const data = createTestLearningEventData(childId);
    return prisma.learningEvent.create({ data: data as any });
  }

  describe('Database Persistence', () => {
    it('should create and persist a learning evidence record', async () => {
      const event = await createEventInDb(childId);

      const evidence = await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'COMPLETION',
          observation: { score: 1, confidence: 0.8 },
        },
      });

      expect(evidence.id).toBeDefined();
      expect(evidence.eventId).toBe(event.eventId);
      expect(evidence.childId).toBe(childId);
      expect(evidence.evidenceType).toBe('COMPLETION');
    });

    it('should retrieve evidence by childId', async () => {
      const event = await createEventInDb(childId);

      await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'ACCURACY',
          observation: { accuracy: 85 },
        },
      });

      const records = await prisma.learningEvidence.findMany({
        where: { childId },
      });

      expect(records.length).toBe(1);
      expect(records[0].childId).toBe(childId);
    });

    it('should retrieve evidence by sessionId', async () => {
      const sessionId = crypto.randomUUID();
      const data = createTestLearningEventData(childId, { sessionId });
      const event = await prisma.learningEvent.create({ data: data as any });

      await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId,
          evidenceType: 'DURATION',
          observation: { durationMs: 5000 },
        },
      });

      const records = await prisma.learningEvidence.findMany({
        where: { sessionId },
      });

      expect(records.length).toBe(1);
      expect(records[0].sessionId).toBe(sessionId);
    });

    it('should cascade delete evidence when the parent learning event is deleted', async () => {
      const event = await createEventInDb(childId);

      await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'COMPLETION',
          observation: { score: 1 },
        },
      });

      await prisma.learningEvent.delete({
        where: { eventId: event.eventId },
      });

      const evidence = await prisma.learningEvidence.findFirst({
        where: { eventId: event.eventId },
      });

      expect(evidence).toBeNull();
    });

    it('should allow multiple evidence types for the same event', async () => {
      const event = await createEventInDb(childId);

      await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'COMPLETION',
          observation: { score: 1, correct: true },
        },
      });

      await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'DURATION',
          observation: { durationMs: 5000 },
        },
      });

      const records = await prisma.learningEvidence.findMany({
        where: { eventId: event.eventId },
      });

      expect(records.length).toBe(2);
      const types = records.map(r => r.evidenceType).sort();
      expect(types).toEqual(['COMPLETION', 'DURATION']);
    });
  });

  describe('Idempotency', () => {
    it('should enforce unique eventId on learning_evidence table', async () => {
      const event = await createEventInDb(childId);

      await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'COMPLETION',
          observation: {},
        },
      });

      await expect(
        prisma.learningEvidence.create({
          data: {
            eventId: event.eventId,
            childId,
            sessionId: event.sessionId,
            evidenceType: 'COMPLETION',
            observation: {},
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce unique idempotencyKey on learning_events table', async () => {
      const data = createTestLearningEventData(childId);
      await prisma.learningEvent.create({ data: data as any });

      await expect(
        prisma.learningEvent.create({
          data: { ...data, eventId: crypto.randomUUID() } as any,
        }),
      ).rejects.toThrow();
    });
  });

  describe('EvidenceRecord Entity', () => {
    it('should create an evidence record with all properties', () => {
      const record = EvidenceRecord.create({
        eventId: 'evt-1',
        childId,
        topicId: 'topic-1',
        sessionId: 'session-1',
        evidenceType: EvidenceType.COMPLETION,
        score: new EvidenceScore(85, 0.9, 1),
        metadata: { correct: true, modality: 'VIDEO' },
        timestamp: new Date('2025-01-01'),
      });

      expect(record.eventId).toBe('evt-1');
      expect(record.childId).toBe(childId);
      expect(record.topicId).toBe('topic-1');
      expect(record.sessionId).toBe('session-1');
      expect(record.evidenceType).toBe(EvidenceType.COMPLETION);
      expect(record.score.score).toBe(85);
      expect(record.score.confidence).toBe(0.9);
      expect(record.metadata.correct).toBe(true);
      expect(record.timestamp).toEqual(new Date('2025-01-01'));
    });

    it('should auto-generate id when not provided', () => {
      const record = EvidenceRecord.create({
        eventId: 'evt-1',
        childId,
        topicId: 'topic-1',
        sessionId: 'session-1',
        evidenceType: EvidenceType.COMPLETION,
        score: new EvidenceScore(1, 0.8),
        metadata: {},
        timestamp: new Date(),
      });

      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe('string');
    });
  });

  describe('EvidenceScore Value Object', () => {
    it('should clamp normalized score to 0-100 range', () => {
      const normal = new EvidenceScore(85, 0.9);
      expect(normal.normalized).toBe(85);

      const over = new EvidenceScore(150, 0.9);
      expect(over.normalized).toBe(100);

      const under = new EvidenceScore(-10, 0.9);
      expect(under.normalized).toBe(0);
    });

    it('should compute weighted score as score times weight', () => {
      const score = new EvidenceScore(80, 0.8, 2);
      expect(score.weightedScore).toBe(160);
    });

    it('should default weight to 1', () => {
      const score = new EvidenceScore(75, 0.9);
      expect(score.weight).toBe(1);
    });
  });
});
