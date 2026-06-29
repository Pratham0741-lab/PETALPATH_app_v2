import { prisma } from '../../../config/database.js';
import { ReinforcementEventType } from '../../../shared/enums.js';
import { Prisma } from '@prisma/client';

export class ReinforcementEventRepository {
  async create(data: {
    childId: string;
    skillId: string;
    eventType: ReinforcementEventType;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.reinforcementEvent.create({ data });
  }

  async findByChild(childId: string, limit = 50) {
    return prisma.reinforcementEvent.findMany({
      where: { childId },
      include: { skill: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByChildAndType(childId: string, eventType: ReinforcementEventType, limit = 20) {
    return prisma.reinforcementEvent.findMany({
      where: { childId, eventType },
      include: { skill: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const reinforcementEventRepository = new ReinforcementEventRepository();
