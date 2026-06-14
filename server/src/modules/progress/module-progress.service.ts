import { prisma } from '../../config/database.js';

export class ModuleProgressService {
  async completeModule(childId: string, moduleId: string): Promise<boolean> {
    // Check if all lessons in the module are completed
    const lessons = await prisma.lesson.findMany({
      where: { moduleId, deletedAt: null },
    });

    if (lessons.length === 0) return false;

    const lessonProgresses = await prisma.lessonProgress.findMany({
      where: {
        childId,
        lessonId: { in: lessons.map((l) => l.id) },
        status: 'COMPLETED',
      },
    });

    const isAllCompleted = lessonProgresses.length === lessons.length;
    if (!isAllCompleted) return false;

    // Check if already marked completed
    const existing = await prisma.moduleProgress.findUnique({
      where: {
        childId_moduleId: { childId, moduleId },
      },
    });

    if (existing?.isCompleted) return false;

    await prisma.moduleProgress.upsert({
      where: {
        childId_moduleId: { childId, moduleId },
      },
      update: {
        isCompleted: true,
        completedLessons: lessons.length,
        completedAt: new Date(),
      },
      create: {
        childId,
        moduleId,
        isCompleted: true,
        completedLessons: lessons.length,
        completedAt: new Date(),
      },
    });

    console.log(`[MODULE COMPLETED] Child ${childId} completed module "${moduleId}"`);
    return true;
  }
}

export const moduleProgressService = new ModuleProgressService();
