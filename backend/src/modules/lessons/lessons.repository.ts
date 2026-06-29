import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export class LessonsRepository {
  async findAll() {
    return prisma.lesson.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.lesson.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByModuleId(moduleId: string) {
    return prisma.lesson.findMany({
      where: { moduleId, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async create(data: Prisma.LessonUncheckedCreateInput) {
    return prisma.lesson.create({
      data,
    });
  }

  async update(id: string, data: Prisma.LessonUncheckedUpdateInput) {
    return prisma.lesson.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.lesson.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const lessonsRepository = new LessonsRepository();
