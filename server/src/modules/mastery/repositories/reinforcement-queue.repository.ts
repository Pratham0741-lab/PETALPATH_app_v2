import { prisma } from '../../../config/database.js';

export class ReinforcementQueueRepository {
  async upsert(childId: string, skillId: string, priority: number, reason: string) {
    return prisma.reinforcementQueue.upsert({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
      update: {
        priority,
        reason,
      },
      create: {
        childId,
        skillId,
        priority,
        reason,
      },
      include: { skill: true },
    });
  }

  async findQueueByChild(childId: string) {
    return prisma.reinforcementQueue.findMany({
      where: { childId },
      include: { skill: true },
      orderBy: { priority: 'desc' },
    });
  }

  async removeFromQueue(childId: string, skillId: string) {
    return prisma.reinforcementQueue.delete({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
    }).catch(() => {
      // Ignore errors if the item was not in the queue
      return null;
    });
  }
}

export const reinforcementQueueRepository = new ReinforcementQueueRepository();
