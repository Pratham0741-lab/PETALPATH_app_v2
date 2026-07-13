import { ILearningEventRepository } from '../../domain/repositories/repository-interfaces.js';
import { LearningEvent } from '../../domain/entities/learning-event.entity.js';
import { LearningEventType, Modality } from '../../domain/value-objects/event-types.js';

export interface CreateLearningEventInput {
  eventId?: string;
  eventType: LearningEventType;
  eventVersion: number;
  childId: string;
  sessionId: string;
  curriculumId?: string;
  subjectId?: string;
  moduleId?: string;
  topicId?: string;
  conceptId?: string;
  activityId?: string;
  modality?: Modality;
  timestamp?: Date;
  duration?: number;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface LearningEventOutput {
  eventId: string;
  eventType: LearningEventType;
  eventVersion: number;
  childId: string;
  sessionId: string;
  curriculumId?: string;
  subjectId?: string;
  moduleId?: string;
  topicId?: string;
  conceptId?: string;
  activityId?: string;
  modality?: Modality;
  timestamp: Date;
  duration?: number;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
}

export class LearningEventApplicationService {
  constructor(private readonly repository: ILearningEventRepository) {}

  async createEvent(input: CreateLearningEventInput): Promise<LearningEventOutput> {
    // Check idempotency
    if (input.idempotencyKey) {
      const exists = await this.repository.existsByIdempotencyKey(input.idempotencyKey);
      if (exists) {
        const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey);
        if (existing) {
          return this.toOutput(existing);
        }
      }
    }

    // Validate required fields
    this.validateInput(input);

    const event = LearningEvent.create({
      eventId: input.eventId,
      eventType: input.eventType,
      eventVersion: input.eventVersion,
      childId: input.childId,
      sessionId: input.sessionId,
      curriculumId: input.curriculumId,
      subjectId: input.subjectId,
      moduleId: input.moduleId,
      topicId: input.topicId,
      conceptId: input.conceptId,
      activityId: input.activityId,
      modality: input.modality,
      timestamp: input.timestamp ?? new Date(),
      duration: input.duration,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    });

    const created = await this.repository.create(event);
    return this.toOutput(created);
  }

  async findById(eventId: string): Promise<LearningEventOutput | null> {
    const event = await this.repository.findById(eventId);
    return event ? this.toOutput(event) : null;
  }

  async getEventsByChild(childId: string, limit = 100, offset = 0): Promise<LearningEventOutput[]> {
    const events = await this.repository.findByChildId(childId, limit, offset);
    return events.map(this.toOutput);
  }

  async getEventsBySession(sessionId: string): Promise<LearningEventOutput[]> {
    const events = await this.repository.findBySessionId(sessionId);
    return events.map(this.toOutput);
  }

  async getEventsByActivity(activityId: string): Promise<LearningEventOutput[]> {
    const events = await this.repository.findByActivityId(activityId);
    return events.map(this.toOutput);
  }

  async getEventsByTopic(topicId: string): Promise<LearningEventOutput[]> {
    const events = await this.repository.findByTopicId(topicId);
    return events.map(this.toOutput);
  }

  private validateInput(input: CreateLearningEventInput): void {
    if (!input.eventId || input.eventId.trim() === '') {
      throw new Error('Event ID is required');
    }
    if (!Object.values(LearningEventType).includes(input.eventType)) {
      throw new Error(`Invalid event type: ${input.eventType}`);
    }
    if (input.eventVersion < 1) {
      throw new Error('Event version must be >= 1');
    }
    if (!input.childId || input.childId.trim() === '') {
      throw new Error('Child ID is required');
    }
    if (!input.sessionId || input.sessionId.trim() === '') {
      throw new Error('Session ID is required');
    }
    if (input.modality && !Object.values(Modality).includes(input.modality)) {
      throw new Error(`Invalid modality: ${input.modality}`);
    }
    if (input.timestamp && (!(input.timestamp instanceof Date) || isNaN(input.timestamp.getTime()))) {
      throw new Error('Invalid timestamp');
    }
  }

  private toOutput(event: LearningEvent): LearningEventOutput {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      childId: event.childId,
      sessionId: event.sessionId,
      curriculumId: event.curriculumId,
      subjectId: event.subjectId,
      moduleId: event.moduleId,
      topicId: event.topicId,
      conceptId: event.conceptId,
      activityId: event.activityId,
      modality: event.modality,
      timestamp: event.timestamp,
      duration: event.duration,
      payload: event.payload,
      idempotencyKey: event.idempotencyKey,
    };
  }
}