import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';
import { Prisma } from '@prisma/client';

export class ReinforcementQueueRepository {
  async upsert(
    childId: string,
    skillId: string,
    data: {
      priority: number;
      masteryState: MasteryState;
      reason: string;
      nextReviewDate: Date;
      isCompleted?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.reinforcementQueue.upsert({
      where: {
        childId_skillId: { childId, skillId },
      },
      update: {
        priority: data.priority,
        masteryState: data.masteryState,
        reason: data.reason,
        nextReviewDate: data.nextReviewDate,
        isCompleted: data.isCompleted ?? false,
      },
      create: {
        childId,
        skillId,
        ...data,
      },
    });
  }

  async findByChild(childId: string) {
    return prisma.reinforcementQueue.findMany({
      where: { childId, isCompleted: false },
      include: { skill: true },
      orderBy: { priority: 'desc' },
    });
  }

  async findDueSkills(childId: string, currentDate: Date) {
    return prisma.reinforcementQueue.findMany({
      where: {
        childId,
        isCompleted: false,
        nextReviewDate: { lte: currentDate },
      },
      include: { skill: true },
      orderBy: { priority: 'desc' },
    });
  }

  async findByChildAndSkill(childId: string, skillId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.reinforcementQueue.findUnique({
      where: {
        childId_skillId: { childId, skillId },
      },
    });
  }

  async markCompleted(childId: string, skillId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.reinforcementQueue.update({
      where: {
        childId_skillId: { childId, skillId },
      },
      data: { isCompleted: true },
    }).catch(() => null);
  }

  async removeByChildAndSkill(childId: string, skillId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.reinforcementQueue.delete({
      where: {
        childId_skillId: { childId, skillId },
      },
    }).catch(() => null);
  }
}

export const reinforcementQueueRepository = new ReinforcementQueueRepository();
