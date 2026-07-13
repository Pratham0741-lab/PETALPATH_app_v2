import { LearningEvidence } from '../../domain/entities/learning-evidence.entity.js';
import { ILearningEvidenceRepository } from '../../domain/repositories/repository-interfaces.js';
import { Modality, EvidenceType } from '../../domain/value-objects/event-types.js';

export interface CreateLearningEvidenceInput {
  eventId: string;
  childId: string;
  sessionId: string;
  activityId?: string;
  topicId?: string;
  modality?: Modality;
  evidenceType: EvidenceType;
  observation: Record<string, unknown>;
}

export interface LearningEvidenceOutput {
  id: string;
  eventId: string;
  childId: string;
  sessionId: string;
  activityId?: string;
  topicId?: string;
  modality?: Modality;
  evidenceType: EvidenceType;
  observation: Record<string, unknown>;
  createdAt: Date;
}

export class LearningEvidenceApplicationService {
  constructor(
    private readonly repository: ILearningEvidenceRepository
  ) {}

  /**
   * Internal method to create evidence from a learning event.
   * This should ONLY be called by the Observation Engine internally,
   * NOT by external API clients.
   */
  async createEvidenceFromEvent(
    input: CreateLearningEvidenceInput
  ): Promise<LearningEvidenceOutput> {
    // Check if evidence already exists for this event
    const existing = await this.repository.findByEventId(input.eventId);
    if (existing) {
      return this.toOutput(existing);
    }

    this.validateInput(input);

    const evidence = LearningEvidence.create({
      eventId: input.eventId,
      childId: input.childId,
      sessionId: input.sessionId,
      activityId: input.activityId,
      topicId: input.topicId,
      modality: input.modality,
      evidenceType: input.evidenceType,
      observation: input.observation,
    });

    const created = await this.repository.create(evidence);
    return this.toOutput(created);
  }

  async getEvidenceByChild(
    childId: string,
    limit = 100,
    offset = 0
  ): Promise<LearningEvidenceOutput[]> {
    const evidence = await this.repository.findByChildId(childId, limit, offset);
    return evidence.map(this.toOutput);
  }

  async getEvidenceBySession(sessionId: string): Promise<LearningEvidenceOutput[]> {
    const evidence = await this.repository.findBySessionId(sessionId);
    return evidence.map(this.toOutput);
  }

  async getEvidenceByActivity(activityId: string): Promise<LearningEvidenceOutput[]> {
    const evidence = await this.repository.findByActivityId(activityId);
    return evidence.map(this.toOutput);
  }

  async getEvidenceByTopic(topicId: string): Promise<LearningEvidenceOutput[]> {
    const evidence = await this.repository.findByTopicId(topicId);
    return evidence.map(this.toOutput);
  }

  private validateInput(input: CreateLearningEvidenceInput): void {
    if (!input.eventId || input.eventId.trim() === '') {
      throw new Error('Event ID is required');
    }
    if (!input.childId || input.childId.trim() === '') {
      throw new Error('Child ID is required');
    }
    if (!input.sessionId || input.sessionId.trim() === '') {
      throw new Error('Session ID is required');
    }
    if (!input.evidenceType || !Object.values(EvidenceType).includes(input.evidenceType)) {
      throw new Error(`Invalid evidence type: ${input.evidenceType}`);
    }
    if (!input.observation || typeof input.observation !== 'object') {
      throw new Error('Observation data is required');
    }
    if (input.modality && !Object.values(Modality).includes(input.modality)) {
      throw new Error(`Invalid modality: ${input.modality}`);
    }
  }

  private toOutput(evidence: LearningEvidence): LearningEvidenceOutput {
    return {
      id: evidence.id,
      eventId: evidence.eventId,
      childId: evidence.childId,
      sessionId: evidence.sessionId,
      activityId: evidence.activityId,
      topicId: evidence.topicId,
      modality: evidence.modality,
      evidenceType: evidence.evidenceType,
      observation: evidence.observation,
      createdAt: evidence.createdAt,
    };
  }
}