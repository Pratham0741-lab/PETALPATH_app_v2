import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export class CategoryProgressService {
  async completeCategory(childId: string, categoryId: string, tx?: any): Promise<boolean> {
    const client = tx || prisma;
    // Check if all modules in the category are completed
    const modules = await client.module.findMany({
      where: { categoryId, deletedAt: null },
    });

    if (modules.length === 0) return false;

    const moduleProgresses = await client.moduleProgress.findMany({
      where: {
        childId,
        moduleId: { in: modules.map((m: any) => m.id) },
        isCompleted: true,
      },
    });

    const isAllCompleted = moduleProgresses.length === modules.length;
    if (!isAllCompleted) return false;

    // Check if already completed
    const existing = await client.categoryProgress.findUnique({
      where: {
        childId_categoryId: { childId, categoryId },
      },
    });

    if (existing?.isCompleted) return false;

    await client.categoryProgress.upsert({
      where: {
        childId_categoryId: { childId, categoryId },
      },
      update: {
        isCompleted: true,
        completedModules: modules.length,
        completedAt: new Date(),
      },
      create: {
        childId,
        categoryId,
        isCompleted: true,
        completedModules: modules.length,
        completedAt: new Date(),
      },
    });

    logger.info({ childId, categoryId }, 'Category completed');
    return true;
  }
}

export const categoryProgressService = new CategoryProgressService();
