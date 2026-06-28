import { prisma } from '../../../config/database.js';
import { ActivityType } from '../../../shared/enums.js';

export class ReinforcementHistoryRepository {
  async create(data: {
    childId: string;
    skillId: string;
    activityType: ActivityType;
    beforeScore: number;
    afterScore: number;
    scoreDifference: number;
    success: boolean;
  }) {
    return prisma.reinforcementHistory.create({ data });
  }

  async findByChild(childId: string, limit = 50) {
    return prisma.reinforcementHistory.findMany({
      where: { childId },
      include: { skill: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByChildAndSkill(childId: string, skillId: string, limit = 10) {
    return prisma.reinforcementHistory.findMany({
      where: { childId, skillId },
      include: { skill: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findRecent(childId: string, skillId: string) {
    return prisma.reinforcementHistory.findFirst({
      where: { childId, skillId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const reinforcementHistoryRepository = new ReinforcementHistoryRepository();
