import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { lessonsService } from './lessons.service.js';
import { lessonAccessService } from './lesson-access.service.js';
import { prisma } from '../../config/database.js';
import { UnauthorizedError, ValidationError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { storageService } from '../../shared/services/storage.service.js';

const formatActivity = (activity: any) => {
  return {
    ...activity,
    video: activity.video
      ? {
          ...activity.video,
          videoUrl: storageService.getVideoUrl(activity.video.videoKey),
          thumbnailUrl: storageService.getPublicUrl(activity.video.thumbnailKey || null),
          filename: activity.video.videoKey,
        }
      : null,
    audio: activity.audio
      ? {
          ...activity.audio,
          audioUrl: storageService.getAudioUrl(activity.audio.audioKey),
          filename: activity.audio.audioKey,
        }
      : null,
  };
};

export class LessonsController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { moduleId } = req.query;
      const lessons = await lessonsService.getAllLessons(moduleId as string);
      return res.status(200).json({
        success: true,
        data: lessons,
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

      const { id } = req.params;
      logger.info({ lessonId: id, childId }, 'Lesson selected and validating access');

      // Reject access if lesson does not match child's grade or is locked
      await lessonAccessService.validateLessonAccess(childId, id);

      const lesson = await lessonsService.getLessonById(id);
      if (!lesson) {
        throw new NotFoundError('Lesson not found');
      }

      return res.status(200).json({
        success: true,
        data: lesson,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnlockedLessons(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const lessons = await lessonsService.getUnlockedLessons(childId);
      return res.status(200).json({
        success: true,
        data: lessons,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLessonActivities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { id } = req.params;

      // Validate access to the lesson
      await lessonAccessService.validateLessonAccess(childId, id);

      const activities = await prisma.activity.findMany({
        where: { lessonId: id, deletedAt: null },
        include: { video: true, audio: true },
        orderBy: { displayOrder: 'asc' },
      });

      return res.status(200).json({
        success: true,
        data: activities.map(formatActivity),
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await lessonsService.createLesson(req.body);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await lessonsService.updateLesson(id, req.body);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await lessonsService.deleteLesson(id);
    } catch (error) {
      next(error);
    }
  }
}

export const lessonsController = new LessonsController();
