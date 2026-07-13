import { prisma } from '../../../config/database.js';
import { LearningEventType, Modality } from '@prisma/client';

export class LearningEventRepository {
  async create(data: {
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
    payload?: any;
    idempotencyKey: string;
  }) {
    return prisma.learningEvent.create({
      data,
    });
  }

  async findByChild(childId: string, limit = 100) {
    return prisma.learningEvent.findMany({
      where: { childId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async findByChildAndType(childId: string, eventType: LearningEventType, limit = 50) {
    return prisma.learningEvent.findMany({
      where: { childId, eventType },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

export const learningEventRepository = new LearningEventRepository();
