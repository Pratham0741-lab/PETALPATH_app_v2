import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { progressRepository } from './progress.repository.js';
import { moduleProgressService } from './module-progress.service.js';
import { categoryProgressService } from './category-progress.service.js';
import { UnauthorizedError, ValidationError } from '../../utils/errors.js';

export class ProgressController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const progress = await progressRepository.findByChildId(childId);
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { lessonId } = req.params;
      if (!lessonId) {
        throw new ValidationError('lessonId parameter is required');
      }

      const progress = await progressRepository.findByChildAndLesson(childId, lessonId);
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      // 1. Completion Percentage
      const totalLessonsCount = await prisma.lesson.count({
        where: { deletedAt: null },
      });

      const completedLessonsCount = await prisma.lessonProgress.count({
        where: { childId, status: 'COMPLETED', deletedAt: null },
      });

      const completionPercentage = totalLessonsCount > 0 
        ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
        : 0;

      // 2. Resolve Continue Learning Target
      const categories = await prisma.category.findMany({
        where: { deletedAt: null },
        orderBy: { displayOrder: 'asc' },
        include: {
          modules: {
            where: { deletedAt: null },
            orderBy: { displayOrder: 'asc' },
            include: {
              lessons: {
                where: { deletedAt: null },
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      });

      const lessonProgressList = await prisma.lessonProgress.findMany({
        where: { childId, deletedAt: null },
      });
      const progressMap = new Map(lessonProgressList.map(lp => [lp.lessonId, lp]));

      let currentTarget = null;
      
      for (const category of categories) {
        for (const module of category.modules) {
          for (const lesson of module.lessons) {
            const prog = progressMap.get(lesson.id);
            if (!prog || prog.status !== 'COMPLETED') {
              currentTarget = {
                category: { id: category.id, title: category.title },
                module: { id: module.id, title: module.title },
                lesson: { id: lesson.id, title: lesson.title },
              };
              break;
            }
          }
          if (currentTarget) break;
        }
        if (currentTarget) break;
      }

      if (!currentTarget && categories.length > 0 && categories[0].modules.length > 0 && categories[0].modules[0].lessons.length > 0) {
        const firstCat = categories[0];
        const firstMod = firstCat.modules[0];
        const firstLes = firstMod.lessons[0];
        currentTarget = {
          category: { id: firstCat.id, title: firstCat.title },
          module: { id: firstMod.id, title: firstMod.title },
          lesson: { id: firstLes.id, title: firstLes.title },
        };
      }

      // 3. Recent Achievements
      const recentBadges = await prisma.childBadge.findMany({
        where: { childId },
        orderBy: { earnedAt: 'desc' },
        take: 3,
        include: { badge: true },
      });

      const recentStickers = await prisma.childSticker.findMany({
        where: { childId },
        orderBy: { unlockedAt: 'desc' },
        take: 3,
        include: { sticker: true },
      });

      return res.status(200).json({
        success: true,
        data: {
          completionPercentage,
          completedLessonsCount,
          totalLessonsCount,
          continueLearning: currentTarget,
          recentAchievements: {
            badges: recentBadges.map(b => b.badge),
            stickers: recentStickers.map(s => s.sticker),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async completeLesson(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { lessonId } = req.body;
      if (!lessonId) {
        throw new ValidationError('lessonId in request body is required');
      }

      const progress = await progressRepository.forceCompleteLesson(childId, lessonId);
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { moduleId } = req.body;
      if (!moduleId) {
        throw new ValidationError('moduleId in request body is required');
      }

      const completed = await moduleProgressService.completeModule(childId, moduleId);
      return res.status(200).json({
        success: true,
        data: { completed },
      });
    } catch (error) {
      next(error);
    }
  }

  async completeCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { categoryId } = req.body;
      if (!categoryId) {
        throw new ValidationError('categoryId in request body is required');
      }

      const completed = await categoryProgressService.completeCategory(childId, categoryId);
      return res.status(200).json({
        success: true,
        data: { completed },
      });
    } catch (error) {
      next(error);
    }
  }

  async resetProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      await progressRepository.resetAllProgress(childId);
      return res.status(200).json({
        success: true,
        message: 'All learning progress has been successfully reset',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const progressController = new ProgressController();
