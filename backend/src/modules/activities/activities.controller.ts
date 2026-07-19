import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { activitiesService } from './activities.service.js';
import { createActivitySchema, updateActivitySchema } from './activities.validator.js';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { lessonAccessService } from '../lessons/lesson-access.service.js';

export class ActivitiesController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { lessonId } = req.query;
      if (lessonId) {
        await lessonAccessService.validateLessonAccess(childId, lessonId as string);
      }

      const activities = await activitiesService.getAllActivities(lessonId as string);
      return res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info({ activityId: id }, 'activity selected');
      const activity = await activitiesService.getActivityById(id);
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createActivitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const activity = await activitiesService.createActivity(parsed.data);
      return res.status(201).json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateActivitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const activity = await activitiesService.updateActivity(id, parsed.data);
      return res.status(200).json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await activitiesService.deleteActivity(id);
      return res.status(200).json({
        success: true,
        data: { message: 'Activity deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const activitiesController = new ActivitiesController();


