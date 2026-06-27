import { prisma } from '../../../config/database.js';

export class SkillDependencyRepository {
  async findByChildSkill(childSkillId: string) {
    return prisma.skillDependency.findMany({
      where: { childSkillId },
      include: { parentSkill: true },
    });
  }
}

export const skillDependencyRepository = new SkillDependencyRepository();
