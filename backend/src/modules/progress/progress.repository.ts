import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export class ProgressRepository {
  async findAll() {
    return prisma.lessonProgress.findMany({
      where: { deletedAt: null },
    });
  }

  async findById(id: string) {
    return prisma.lessonProgress.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByChildAndLesson(childId: string, lessonId: string) {
    return prisma.lessonProgress.findUnique({
      where: {
        childId_lessonId: { childId, lessonId },
      },
    });
  }

  async findByChildId(childId: string) {
    return prisma.lessonProgress.findMany({
      where: { childId, deletedAt: null },
    });
  }

  async create(data: Prisma.LessonProgressUncheckedCreateInput | Prisma.LessonProgressCreateInput) {
    return prisma.lessonProgress.create({
      data: data as any,
    });
  }

  async update(id: string, data: Prisma.LessonProgressUpdateInput) {
    return prisma.lessonProgress.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.lessonProgress.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const progressRepository = new ProgressRepository();

