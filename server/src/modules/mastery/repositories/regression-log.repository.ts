import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';

export interface CreateRegressionLogInput {
  childId: string;
  skillId: string;
  previousScore: number;
  currentScore: number;
  previousState: MasteryState;
  currentState: MasteryState;
}

export class RegressionLogRepository {
  async create(data: CreateRegressionLogInput) {
    return prisma.regressionLog.create({
      data,
    });
  }

  async findByChild(childId: string) {
    return prisma.regressionLog.findMany({
      where: { childId },
      include: { skill: true },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findRecent(childId: string, limit: number) {
    return prisma.regressionLog.findMany({
      where: { childId },
      include: { skill: true },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

export const regressionLogRepository = new RegressionLogRepository();
