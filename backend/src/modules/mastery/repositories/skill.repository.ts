import { prisma } from '../../../config/database.js';

export class SkillRepository {
  async findAll() {
    return prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.skill.findUnique({
      where: { id },
    });
  }

  async findByName(name: string) {
    return prisma.skill.findUnique({
      where: { name },
    });
  }

  async create(data: { name: string; description?: string | null; subjectId: string }) {
    return prisma.skill.create({
      data,
    });
  }

  async upsert(name: string, description?: string | null, subjectId?: string) {
    return prisma.skill.upsert({
      where: { name },
      update: { description },
      create: { name, description, subjectId: subjectId || '' },
    });
  }
}

export const skillRepository = new SkillRepository();

