import { prisma } from '../../../config/database.js';
import { TrendEventType } from '../../../shared/enums.js';

export class TrendEventRepository {
  async create(data: { childId: string; eventType: TrendEventType; metadata?: any }) {
    return prisma.trendEvent.create({
      data: {
        childId: data.childId,
        eventType: data.eventType,
        metadata: data.metadata || null,
      },
    });
  }

  async findByChild(childId: string, limit = 50) {
    return prisma.trendEvent.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByChildAndType(childId: string, eventType: TrendEventType, limit = 20) {
    return prisma.trendEvent.findMany({
      where: { childId, eventType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findRecent(childId: string, limit = 10) {
    return prisma.trendEvent.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findLastEventOfType(childId: string, eventType: TrendEventType) {
    return prisma.trendEvent.findFirst({
      where: { childId, eventType },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const trendEventRepository = new TrendEventRepository();
