import { prisma } from '../../../config/database.js';

export interface DerivedReviewSchedule {
  id: string;
  childId: string;
  skillId: string;
  nextReviewDate: Date;
  frequencyDays: number;
  createdAt: Date;
}

export class ReviewScheduleRepository {
  private mapToDerived(healthRecord: any): DerivedReviewSchedule | null {
    if (!healthRecord) return null;
    return {
      id: healthRecord.id,
      childId: healthRecord.childId,
      skillId: healthRecord.skillId,
      nextReviewDate: healthRecord.nextReviewDate,
      frequencyDays: healthRecord.frequencyDays,
      createdAt: healthRecord.createdAt,
    };
  }

  async findByChildAndSkill(childId: string, skillId: string): Promise<DerivedReviewSchedule | null> {
    const record = await prisma.skillHealth.findUnique({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
    });
    return this.mapToDerived(record);
  }

  async findByChild(childId: string): Promise<DerivedReviewSchedule[]> {
    const records = await prisma.skillHealth.findMany({
      where: {
        childId,
      },
      orderBy: {
        nextReviewDate: 'asc',
      },
    });
    return records
      .map((r) => this.mapToDerived(r))
      .filter((r): r is DerivedReviewSchedule => r !== null);
  }

  async findDueReviews(childId: string, currentDate: Date): Promise<DerivedReviewSchedule[]> {
    const records = await prisma.skillHealth.findMany({
      where: {
        childId,
        nextReviewDate: {
          lte: currentDate,
        },
      },
      orderBy: {
        nextReviewDate: 'asc',
      },
    });
    return records
      .map((r) => this.mapToDerived(r))
      .filter((r): r is DerivedReviewSchedule => r !== null);
  }

  async upsert(
    childId: string,
    skillId: string,
    nextReviewDate: Date,
    frequencyDays: number
  ): Promise<DerivedReviewSchedule | null> {
    const record = await prisma.skillHealth.upsert({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
      update: {
        nextReviewDate,
        frequencyDays,
      },
      create: {
        childId,
        skillId,
        nextReviewDate,
        frequencyDays,
        masteryState: 'NEW',
        knowledgeScore: 0.0,
        confidenceScore: 0.0,
        retentionScore: 0.0,
        engagementScore: 0.0,
        consistencyScore: 0.0,
        masteryScore: 0.0,
        lastPracticed: new Date(),
        reviewCount: 0,
        attemptCount: 0,
        retryCount: 0,
        decayFactor: 0.995,
      },
    });
    return this.mapToDerived(record);
  }

  async delete(childId: string, skillId: string): Promise<void> {
    // Reset nextReviewDate to now and frequencyDays to 2 as defaults to represent deletion of specific schedule
    await prisma.skillHealth.update({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
      data: {
        nextReviewDate: new Date(),
        frequencyDays: 2,
      },
    }).catch(() => {
      // Ignore if not found
    });
  }
}

export const reviewScheduleRepository = new ReviewScheduleRepository();
