import { prisma } from '../../../config/database.js';
import { SessionEventType } from '../../../shared/enums.js';
import { Prisma } from '@prisma/client';

export class SessionEventRepository {
  async create(data: {
    sessionPlanId: string;
    eventType: SessionEventType;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.sessionEvent.create({
      data: {
        sessionPlanId: data.sessionPlanId,
        eventType: data.eventType,
        metadata: data.metadata ?? Prisma.DbNull,
      },
    });
  }

  async findByPlanId(sessionPlanId: string) {
    return prisma.sessionEvent.findMany({
      where: { sessionPlanId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByChild(childId: string, limit = 50) {
    return prisma.sessionEvent.findMany({
      where: {
        sessionPlan: {
          childId,
        },
      },
      include: {
        sessionPlan: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const sessionEventRepository = new SessionEventRepository();
