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

  /**
   * How many reviews this child has finished since `since`.
   *
   * The roadmap's `maxReviewsPerDay` cap needs to count what has already been
   * done today, and this is the only append-only record of a review actually
   * happening — the queue row is mutated in place, so it cannot answer "how many
   * today". Pass the start of the child's local day; see
   * `shared/utils/calendar-day.ts::startOfLocalDay`.
   */
  async countSince(childId: string, since: Date) {
    return prisma.reinforcementHistory.count({
      where: { childId, createdAt: { gte: since } },
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
