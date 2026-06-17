import { prisma } from '../../../config/database.js';

export class LearningEventRepository {
  async create(data: {
    childId: string;
    eventType: string;
    value?: number | null;
    metadata?: any;
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

  async findByChildAndType(childId: string, eventType: string, limit = 50) {
    return prisma.learningEvent.findMany({
      where: { childId, eventType },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

export const learningEventRepository = new LearningEventRepository();
