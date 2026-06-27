import { prisma } from '../../../config/database.js';
import { ActivityType } from '../../../shared/enums.js';

export class LearningProfileRepository {
  async findByChildId(childId: string) {
    return prisma.learningProfile.findUnique({
      where: { childId },
    });
  }

  async upsert(
    childId: string,
    data: {
      averageAccuracy: number;
      averageEngagement: number;
      averageConfidence: number;
      optimalSessionDuration: number;
      preferredModality: ActivityType;
      learningVelocity: number;
    }
  ) {
    return prisma.learningProfile.upsert({
      where: { childId },
      update: data,
      create: {
        childId,
        ...data,
      },
    });
  }
}

export const learningProfileRepository = new LearningProfileRepository();
