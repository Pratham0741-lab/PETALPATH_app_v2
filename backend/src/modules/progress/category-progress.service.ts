import { prisma } from '../../config/database.js';

export class CategoryProgressService {
  async completeCategory(childId: string, categoryId: string): Promise<boolean> {
    // Check if all modules in the category are completed
    const modules = await prisma.module.findMany({
      where: { categoryId, deletedAt: null },
    });

    if (modules.length === 0) return false;

    const moduleProgresses = await prisma.moduleProgress.findMany({
      where: {
        childId,
        moduleId: { in: modules.map((m) => m.id) },
        isCompleted: true,
      },
    });

    const isAllCompleted = moduleProgresses.length === modules.length;
    if (!isAllCompleted) return false;

    // Check if already completed
    const existing = await prisma.categoryProgress.findUnique({
      where: {
        childId_categoryId: { childId, categoryId },
      },
    });

    if (existing?.isCompleted) return false;

    await prisma.categoryProgress.upsert({
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

    console.log(`[CATEGORY COMPLETED] Child ${childId} completed category "${categoryId}"`);
    return true;
  }
}

export const categoryProgressService = new CategoryProgressService();
