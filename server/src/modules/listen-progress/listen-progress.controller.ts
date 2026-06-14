import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { listenProgressService } from './listen-progress.service.js';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';

export class ListenProgressController {
  async getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { activityId } = req.params;
      if (!activityId) {
        throw new ValidationError('activityId parameter is required');
      }

      const progress = await listenProgressService.getProgress(childId, activityId);
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  async saveProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { activityId, isCompleted } = req.body;
      if (!activityId) {
        throw new ValidationError('activityId is required');
      }
      if (isCompleted === undefined || isCompleted === null) {
        throw new ValidationError('isCompleted is required');
      }

      const progress = await listenProgressService.saveProgress(childId, activityId, Boolean(isCompleted));
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeListen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { activityId } = req.body;
      if (!activityId) {
        throw new ValidationError('activityId is required');
      }

      const progress = await listenProgressService.completeListen(childId, activityId);
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const listenProgressController = new ListenProgressController();
