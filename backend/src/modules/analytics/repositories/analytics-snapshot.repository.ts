import { prisma } from '../../../config/database.js';

export class AnalyticsSnapshotRepository {
  async upsert(
    childId: string,
    data: {
      accuracy: number;
      confidence: number;
      retention: number;
      engagement: number;
      learningVelocity: number;
      sessionCompletionRate: number;
      reinforcementSuccessRate: number;
    }
  ) {
    return prisma.analyticsSnapshot.upsert({
      where: { childId },
      update: data,
      create: {
        childId,
        ...data,
      },
    });
  }

  async findByChild(childId: string) {
    return prisma.analyticsSnapshot.findUnique({
      where: { childId },
    });
  }
}

export const analyticsSnapshotRepository = new AnalyticsSnapshotRepository();
