import { prisma } from '../../../../config/database.js';
import { LearningEvent, LearningEventProps } from '../../domain/entities/learning-event.entity.js';
import { ILearningEventRepository } from '../../domain/repositories/repository-interfaces.js';
import { LearningEventType, Modality } from '../../domain/value-objects/event-types.js';

function toPrismaCreate(entity: LearningEvent): Record<string, unknown> {
  return {
    eventId: entity.eventId,
    eventType: entity.eventType,
    eventVersion: entity.eventVersion,
    childId: entity.childId,
    sessionId: entity.sessionId,
    curriculumId: entity.curriculumId,
    subjectId: entity.subjectId,
    moduleId: entity.moduleId,
    topicId: entity.topicId,
    conceptId: entity.conceptId,
    activityId: entity.activityId,
    modality: entity.modality,
    timestamp: entity.timestamp,
    duration: entity.duration,
    payload: entity.payload ? JSON.stringify(entity.payload) : null,
    idempotencyKey: entity.idempotencyKey,
  };
}

function mapToEntity(data: any): LearningEvent {
  return new LearningEvent({
    eventId: data.eventId as string,
    eventType: data.eventType as LearningEventType,
    eventVersion: data.eventVersion as number,
    childId: data.childId as string,
    sessionId: data.sessionId as string,
    curriculumId: data.curriculumId as string | undefined,
    subjectId: data.subjectId as string | undefined,
    moduleId: data.moduleId as string | undefined,
    topicId: data.topicId as string | undefined,
    conceptId: data.conceptId as string | undefined,
    activityId: data.activityId as string | undefined,
    modality: data.modality as Modality | undefined,
    timestamp: data.timestamp as Date,
    duration: data.duration as number | undefined,
    payload: data.payload as Record<string, unknown> | undefined,
    idempotencyKey: data.idempotencyKey as string,
  });
}

export class LearningEventRepository implements ILearningEventRepository {
  async create(event: LearningEvent): Promise<LearningEvent> {
    const created = await prisma.learningEvent.create({
      data: toPrismaCreate(event) as any,
    });
    return mapToEntity(created);
  }

  async findById(eventId: string): Promise<LearningEvent | null> {
    const data = await prisma.learningEvent.findUnique({
      where: { eventId },
    });
    return data ? mapToEntity(data) : null;
  }

  async findByChildId(childId: string, limit = 100, offset = 0): Promise<LearningEvent[]> {
    const data = await prisma.learningEvent.findMany({
      where: { childId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });
    return data.map(mapToEntity);
  }

  async findBySessionId(sessionId: string): Promise<LearningEvent[]> {
    const data = await prisma.learningEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async findByActivityId(activityId: string): Promise<LearningEvent[]> {
    const data = await prisma.learningEvent.findMany({
      where: { activityId },
      orderBy: { timestamp: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async findByTopicId(topicId: string): Promise<LearningEvent[]> {
    const data = await prisma.learningEvent.findMany({
      where: { topicId },
      orderBy: { timestamp: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<LearningEvent | null> {
    const data = await prisma.learningEvent.findUnique({
      where: { idempotencyKey },
    });
    return data ? mapToEntity(data) : null;
  }

  async existsByIdempotencyKey(idempotencyKey: string): Promise<boolean> {
    const count = await prisma.learningEvent.count({
      where: { idempotencyKey },
    });
    return count > 0;
  }
}