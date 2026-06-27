import { prisma } from '../../../config/database.js';

export class SubjectAnalyticsRepository {
  async upsert(
    childId: string,
    subjectId: string,
    data: {
      accuracy: number;
      confidence: number;
      retention: number;
      progress: number;
      learningVelocity: number;
    }
  ) {
    return prisma.subjectAnalytics.upsert({
      where: {
        childId_subjectId: { childId, subjectId },
      },
      update: data,
      create: {
        childId,
        subjectId,
        ...data,
      },
      include: {
        subject: true,
      },
    });
  }

  async findByChild(childId: string) {
    return prisma.subjectAnalytics.findMany({
      where: { childId },
      include: {
        subject: true,
      },
    });
  }

  async findByChildAndSubject(childId: string, subjectId: string) {
    return prisma.subjectAnalytics.findUnique({
      where: {
        childId_subjectId: { childId, subjectId },
      },
      include: {
        subject: true,
      },
    });
  }
}

export const subjectAnalyticsRepository = new SubjectAnalyticsRepository();
