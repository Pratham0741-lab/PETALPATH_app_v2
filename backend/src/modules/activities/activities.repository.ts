import { prisma } from '../../config/database.js';

export class ActivitiesRepository {
  async findAll() {
    return prisma.activity.findMany({
      where: { deletedAt: null },
      include: { video: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.activity.findFirst({
      where: { id, deletedAt: null },
      include: { video: true },
    });
  }

  async findByLessonId(lessonId: string) {
    return prisma.activity.findMany({
      where: { lessonId, deletedAt: null },
      include: { video: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async create(data: any) {
    return prisma.activity.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.activity.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const activitiesRepository = new ActivitiesRepository();

