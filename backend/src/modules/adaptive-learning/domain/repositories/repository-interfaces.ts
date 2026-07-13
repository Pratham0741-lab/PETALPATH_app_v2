import { LearningEvent } from '../entities/learning-event.entity.js';
import { LearningEvidence } from '../entities/learning-evidence.entity.js';

export interface ILearningEventRepository {
  create(event: LearningEvent): Promise<LearningEvent>;
  findById(eventId: string): Promise<LearningEvent | null>;
  findByChildId(childId: string, limit?: number, offset?: number): Promise<LearningEvent[]>;
  findBySessionId(sessionId: string): Promise<LearningEvent[]>;
  findByActivityId(activityId: string): Promise<LearningEvent[]>;
  findByTopicId(topicId: string): Promise<LearningEvent[]>;
  findByIdempotencyKey(idempotencyKey: string): Promise<LearningEvent | null>;
  existsByIdempotencyKey(idempotencyKey: string): Promise<boolean>;
}

export interface ILearningEvidenceRepository {
  create(evidence: LearningEvidence): Promise<LearningEvidence>;
  findByEventId(eventId: string): Promise<LearningEvidence | null>;
  findByChildId(childId: string, limit?: number, offset?: number): Promise<LearningEvidence[]>;
  findBySessionId(sessionId: string): Promise<LearningEvidence[]>;
  findByActivityId(activityId: string): Promise<LearningEvidence[]>;
  findByTopicId(topicId: string): Promise<LearningEvidence[]>;
}