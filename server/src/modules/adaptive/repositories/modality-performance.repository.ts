import { prisma } from '../../../config/database.js';
import { ActivityType } from '@prisma/client';

export class ModalityPerformanceRepository {
  async findByChildAndModality(childId: string, activityType: ActivityType) {
    return prisma.modalityPerformance.findUnique({
      where: {
        childId_activityType: {
          childId,
          activityType,
        },
      },
    });
  }

  async findByChild(childId: string) {
    return prisma.modalityPerformance.findMany({
      where: { childId },
      orderBy: { averageAccuracy: 'desc' },
    });
  }

  async upsert(
    childId: string,
    activityType: ActivityType,
    data: {
      attempts: number;
      averageAccuracy: number;
      averageEngagement: number;
      averageConfidence: number;
      lastUsedAt: Date;
    }
  ) {
    return prisma.modalityPerformance.upsert({
      where: {
        childId_activityType: {
          childId,
          activityType,
        },
      },
      update: data,
      create: {
        childId,
        activityType,
        ...data,
      },
    });
  }
}

export const modalityPerformanceRepository = new ModalityPerformanceRepository();
