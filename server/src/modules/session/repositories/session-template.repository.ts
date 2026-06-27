import { prisma } from '../../../config/database.js';

export class SessionTemplateRepository {
  async create(data: { name: string; durationMinutes: number; blockSequence: any }) {
    return prisma.sessionTemplate.create({
      data: {
        name: data.name,
        durationMinutes: data.durationMinutes,
        blockSequence: data.blockSequence,
      },
    });
  }

  async findAll() {
    return prisma.sessionTemplate.findMany({
      orderBy: { durationMinutes: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.sessionTemplate.findUnique({
      where: { id },
    });
  }

  async findByDuration(durationMinutes: number) {
    // Find the closest template duration
    const templates = await prisma.sessionTemplate.findMany();
    if (templates.length === 0) return null;

    // Find the template with minimum absolute difference in duration
    return templates.reduce((closest, current) => {
      const currentDiff = Math.abs(current.durationMinutes - durationMinutes);
      const closestDiff = Math.abs(closest.durationMinutes - durationMinutes);
      return currentDiff < closestDiff ? current : closest;
    });
  }

  async upsert(name: string, durationMinutes: number, blockSequence: any) {
    const existing = await prisma.sessionTemplate.findFirst({
      where: { name },
    });

    if (existing) {
      return prisma.sessionTemplate.update({
        where: { id: existing.id },
        data: { durationMinutes, blockSequence },
      });
    }

    return prisma.sessionTemplate.create({
      data: { name, durationMinutes, blockSequence },
    });
  }
}

export const sessionTemplateRepository = new SessionTemplateRepository();
