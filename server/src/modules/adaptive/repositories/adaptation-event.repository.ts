import { prisma } from '../../../config/database.js';
import { AdaptationEventType } from '@prisma/client';

export class AdaptationEventRepository {
  async create(data: {
    childId: string;
    eventType: AdaptationEventType;
    reason: string;
    metadata?: any;
  }) {
    return prisma.adaptationEvent.create({
      data,
    });
  }

  async findByChild(childId: string, limit = 50) {
    return prisma.adaptationEvent.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByChildAndType(childId: string, eventType: AdaptationEventType, limit = 5) {
    return prisma.adaptationEvent.findMany({
      where: { childId, eventType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const adaptationEventRepository = new AdaptationEventRepository();
