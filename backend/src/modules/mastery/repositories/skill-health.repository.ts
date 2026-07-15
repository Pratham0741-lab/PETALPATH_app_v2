import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';
import { Prisma } from '@prisma/client';

export class SkillHealthRepository {
  async findByChildAndSkill(childId: string, skillId: string) {
    return prisma.skillHealth.findUnique({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
      include: { skill: true },
    });
  }

  async findByChild(childId: string) {
    return prisma.skillHealth.findMany({
      where: { childId },
      include: { skill: true },
      orderBy: { masteryScore: 'desc' },
    });
  }

  async findWeakSkills(childId: string) {
    return prisma.skillHealth.findMany({
      where: {
        childId,
        OR: [
          { masteryState: MasteryState.WEAK },
          { masteryState: MasteryState.LEARNING },
          { masteryScore: { lt: 50.0 } },
        ],
      },
      include: { skill: true },
      orderBy: { masteryScore: 'asc' },
    });
  }

  async findDueReviews(childId: string, currentDate: Date) {
    return prisma.skillHealth.findMany({
      where: {
        childId,
        nextReviewDate: {
          lte: currentDate,
        },
      },
      include: { skill: true },
      orderBy: { nextReviewDate: 'asc' },
    });
  }

  async upsert(childId: string, skillId: string, data: Prisma.SkillHealthUpdateInput) {
    const defaults: Prisma.SkillHealthUncheckedCreateInput = {
      childId,
      skillId,
      confidenceScore: 0,
      retentionScore: 0,
      engagementScore: 0,
      consistencyScore: 0,
      masteryScore: 0,
      lastPracticed: new Date(),
      nextReviewDate: new Date(),
      reviewCount: 0,
      attemptCount: 0,
      retryCount: 0,
      decayFactor: 0.5,
      frequencyDays: 7,
      ...data,
    } as Prisma.SkillHealthUncheckedCreateInput;

    return prisma.skillHealth.upsert({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
      update: data,
      create: defaults,
      include: { skill: true },
    });
  }
}

export const skillHealthRepository = new SkillHealthRepository();
