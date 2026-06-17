import { prisma } from '../../../config/database.js';
import { CurriculumState } from '@prisma/client';

export class ChildSkillCurriculumRepository {
  async findByChildAndSkill(childId: string, skillId: string) {
    return prisma.childSkillCurriculum.findUnique({
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
    return prisma.childSkillCurriculum.findMany({
      where: { childId },
      include: { skill: { include: { subject: true } } },
    });
  }

  async findByChildAndSubject(childId: string, subjectId: string) {
    return prisma.childSkillCurriculum.findMany({
      where: {
        childId,
        skill: {
          subjectId,
        },
      },
      include: { skill: true },
    });
  }

  async upsert(
    childId: string,
    skillId: string,
    data: {
      state: CurriculumState;
      unlockRatio: number;
      priority: number;
      activatedAt?: Date | null;
      completedAt?: Date | null;
    }
  ) {
    return prisma.childSkillCurriculum.upsert({
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

export const childSkillCurriculumRepository = new ChildSkillCurriculumRepository();
