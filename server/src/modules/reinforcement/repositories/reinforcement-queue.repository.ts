import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';

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
    }
  ) {
    return prisma.reinforcementQueue.upsert({
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
      include: { skill: true },
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

  async findByChildAndSkill(childId: string, skillId: string) {
    return prisma.reinforcementQueue.findUnique({
      where: {
        childId_skillId: { childId, skillId },
      },
      include: { skill: true },
    });
  }

  async markCompleted(childId: string, skillId: string) {
    return prisma.reinforcementQueue.update({
      where: {
        childId_skillId: { childId, skillId },
      },
      data: { isCompleted: true },
    }).catch(() => null);
  }

  async removeByChildAndSkill(childId: string, skillId: string) {
    return prisma.reinforcementQueue.delete({
      where: {
        childId_skillId: { childId, skillId },
      },
    }).catch(() => null);
  }
}

export const reinforcementQueueRepository = new ReinforcementQueueRepository();
