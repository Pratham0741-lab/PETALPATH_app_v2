import { prisma } from '../../../config/database.js';

export class SkillRepository {
  async findById(id: string) {
    return prisma.skill.findUnique({
      where: { id },
      include: { subject: true },
    });
  }

  async findAll(where: any = {}) {
    return prisma.skill.findMany({
      where,
      include: { subject: true },
    });
  }

  async findBySubject(subjectId: string) {
    return prisma.skill.findMany({
      where: { subjectId },
      orderBy: { difficulty: 'asc' },
    });
  }
}

export const skillRepository = new SkillRepository();
