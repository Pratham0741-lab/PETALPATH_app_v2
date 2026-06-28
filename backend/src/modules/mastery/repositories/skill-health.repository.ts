import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';

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

  async upsert(childId: string, skillId: string, data: any) {
    return prisma.skillHealth.upsert({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
      update: data,
      create: {
        childId,
        skillId,
        ...data,
      },
      include: { skill: true },
    });
  }
}

export const skillHealthRepository = new SkillHealthRepository();
