import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';

export class ModuleProgressService {
  async completeModule(childId: string, moduleId: string, tx?: any): Promise<boolean> {
    const client = tx || prisma;
    // Check if all lessons in the module/theme are completed using CurriculumService
    const lessons = curriculumService.getLessonsByTheme(moduleId);

    if (lessons.length === 0) return false;

    const lessonProgresses = await client.lessonProgress.findMany({
      where: {
        childId,
        lessonId: { in: lessons.map((l) => l.id) },
      },
    });

    const isAllCompleted = curriculumEngineService.isThemeCompleted(moduleId, lessons, lessonProgresses);
    if (!isAllCompleted) return false;

    // Check if already marked completed
    const existing = await client.moduleProgress.findUnique({
      where: {
        childId_moduleId: { childId, moduleId },
      },
    });

    if (existing?.isCompleted) return false;

    await client.moduleProgress.upsert({
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

    logger.info({ childId, moduleId }, 'Module completed');
    return true;
  }
}

export const moduleProgressService = new ModuleProgressService();
