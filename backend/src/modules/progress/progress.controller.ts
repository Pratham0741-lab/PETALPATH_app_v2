import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { progressService } from './progress.service.js';
import { moduleProgressService } from './module-progress.service.js';
import { categoryProgressService } from './category-progress.service.js';
import { UnauthorizedError, ValidationError, NotFoundError } from '../../utils/errors.js';
import { z } from 'zod';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { curriculumLoader } from '../curriculum/curriculum-loader.js';
import { lessonAccessService } from '../lessons/lesson-access.service.js';

const lessonIdParamSchema = z.object({ lessonId: z.string().min(1, 'lessonId is required') });
const lessonIdBodySchema = z.object({ lessonId: z.string().min(1, 'lessonId is required') });
const moduleIdBodySchema = z.object({ moduleId: z.string().uuid('moduleId must be a UUID') });
const categoryIdBodySchema = z.object({ categoryId: z.string().uuid('categoryId must be a UUID') });

const completeActivityBodySchema = z.object({
  lessonId: z.string().min(1, 'lessonId is required'),
  activityType: z.string().min(1, 'activityType is required'),
  stars: z.number().int().nonnegative().default(0),
});

export class ProgressController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const progress = await progressService.getByChildId(childId);
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

      const parsed = lessonIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      await lessonAccessService.validateLessonAccess(childId, parsed.data.lessonId);

      const progress = await progressService.getByChildAndLesson(childId, parsed.data.lessonId);
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
      const child = await prisma.child.findUnique({
        where: { id: childId },
      });
      const gradeId = child ? curriculumService.resolveChildGrade(child) : 'prenursery';
      const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
      const totalLessonsCount = lessons.length;

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
            badges: recentBadges.map(b => b.badge).filter(Boolean),
            stickers: recentStickers.map(s => s.sticker).filter(Boolean),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const child = await prisma.child.findUnique({
        where: { id: childId },
      });
      if (!child) {
        throw new NotFoundError('Child profile not found');
      }

      const gradeId = curriculumService.resolveChildGrade(child);
      const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
      if (!gradeCurriculum) {
        throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
      }

      const gradeLessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
      const progressList = await prisma.lessonProgress.findMany({
        where: { childId },
      });
      const knowledgeStates = await prisma.knowledgeState.findMany({
        where: { childId },
      });

      const completedLessonsList = progressList.filter(
        (p) => p.status === 'COMPLETED' && gradeLessons.some((gl) => gl.id === p.lessonId)
      );
      const completedLessonsCount = completedLessonsList.length;
      const remainingLessonsCount = gradeLessons.length - completedLessonsCount;

      const completionPercentage = gradeLessons.length > 0
        ? parseFloat(((completedLessonsCount / gradeLessons.length) * 100).toFixed(1))
        : 0.0;

      const currentLessonId = curriculumEngineService.determineNextAvailableLesson(
        gradeLessons,
        progressList,
        knowledgeStates
      ) || (gradeLessons.length > 0 ? gradeLessons[gradeLessons.length - 1].id : null);

      const currentLessonNode = currentLessonId ? curriculumService.getLessonById(currentLessonId) : null;
      const currentLesson = currentLessonNode
        ? {
            id: currentLessonNode.id,
            title: currentLessonNode.title,
            description: currentLessonNode.curriculum.learning_outcome,
          }
        : null;

      const themeId = currentLessonId ? curriculumLoader.getLessonIndex(currentLessonId)?.themeId : null;
      const themeNode = themeId ? gradeCurriculum.themes.find((t) => t.id === themeId) : null;
      const currentTheme = themeNode
        ? {
            id: themeNode.id,
            title: themeNode.title,
          }
        : null;

      // Sum of completed lessons' static reward XP
      const xpEarned = progressList
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + (curriculumService.getReward(p.lessonId)?.xp || 0), 0);

      // Sum of total stars earned across all lesson progress
      const starsEarned = progressList.reduce((sum, p) => sum + (p.totalStars || 0), 0);

      return res.status(200).json({
        success: true,
        data: {
          currentGrade: { id: gradeCurriculum.grade.id, name: gradeCurriculum.grade.name },
          currentTheme,
          currentLesson,
          completedLessons: completedLessonsCount,
          remainingLessons: remainingLessonsCount,
          xpEarned,
          starsEarned,
          completionPercentage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async completeActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const parsed = completeActivityBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const { lessonId, activityType, stars } = parsed.data;

      // Validate access to the lesson (must be unlocked and belong to child's grade)
      await lessonAccessService.validateLessonAccess(childId, lessonId);

      // Validate that the activityType is defined for this lesson in the curriculum
      const lessonNode = curriculumService.getLessonById(lessonId);
      if (!lessonNode) {
        throw new NotFoundError('Lesson not found in curriculum');
      }

      const validActivity = lessonNode.activities.some((act) => act.type === activityType);
      if (!validActivity) {
        throw new ValidationError(`Activity type '${activityType}' is not defined for lesson '${lessonId}'`);
      }

      // Record activity completion and evaluate transactional progression
      await progressService.updateActivityCompletion(childId, lessonId, activityType, stars);

      const progress = await progressService.getByChildAndLesson(childId, lessonId);
      return res.status(200).json({
        success: true,
        data: progress,
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

      const parsed = lessonIdBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      // Validate access to the lesson
      await lessonAccessService.validateLessonAccess(childId, parsed.data.lessonId);

      const progress = await progressService.forceCompleteLesson(childId, parsed.data.lessonId);
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

      const parsed = moduleIdBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const completed = await moduleProgressService.completeModule(childId, parsed.data.moduleId);
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

      const parsed = categoryIdBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const completed = await categoryProgressService.completeCategory(childId, parsed.data.categoryId);
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

      await progressService.resetAllProgress(childId);
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
