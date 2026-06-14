import { Request, Response, NextFunction } from 'express';
import { activitiesService } from './activities.service.js';
import { createActivitySchema, updateActivitySchema } from './activities.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class ActivitiesController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { lessonId } = req.query;
      const activities = await activitiesService.getAllActivities(lessonId as string);
      return res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      console.log(`Activity selected: ${id}`);
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

  async create(req: Request, res: Response, next: NextFunction) {
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

  async update(req: Request, res: Response, next: NextFunction) {
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

  async delete(req: Request, res: Response, next: NextFunction) {
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

