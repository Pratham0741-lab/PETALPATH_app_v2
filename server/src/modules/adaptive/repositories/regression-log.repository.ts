import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';

export class RegressionLogRepository {
  async create(data: {
    childId: string;
    skillId: string;
    previousScore: number;
    currentScore: number;
    difference: number;
    previousState: MasteryState;
    currentState: MasteryState;
  }) {
    return prisma.regressionLog.create({
      data,
    });
  }
}

export const regressionLogRepository = new RegressionLogRepository();
