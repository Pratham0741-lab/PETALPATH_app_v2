import { prisma } from '../../../config/database.js';

export class SkillDependencyRepository {
  async findPrerequisites(childSkillId: string) {
    return prisma.skillDependency.findMany({
      where: { childSkillId },
      include: { parentSkill: true },
    });
  }

  async findImpacts(parentSkillId: string) {
    return prisma.skillDependency.findMany({
      where: { parentSkillId },
      include: { childSkill: true },
    });
  }

  async create(parentSkillId: string, childSkillId: string, weight: number) {
    return prisma.skillDependency.create({
      data: {
        parentSkillId,
        childSkillId,
        weight,
      },
    });
  }

  async upsert(parentSkillId: string, childSkillId: string, weight: number) {
    return prisma.skillDependency.upsert({
      where: {
        parentSkillId_childSkillId: {
          parentSkillId,
          childSkillId,
        },
      },
      update: { weight },
      create: {
        parentSkillId,
        childSkillId,
        weight,
      },
    });
  }
}

export const skillDependencyRepository = new SkillDependencyRepository();
