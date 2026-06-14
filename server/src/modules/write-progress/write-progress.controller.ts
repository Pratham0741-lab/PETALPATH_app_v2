import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { writeProgressService } from './write-progress.service.js';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';

export class WriteProgressController {
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

      const progress = await writeProgressService.getProgress(childId, activityId);
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

      const { activityId, isCompleted, score } = req.body;
      if (!activityId) {
        throw new ValidationError('activityId is required');
      }
      if (isCompleted === undefined || isCompleted === null) {
        throw new ValidationError('isCompleted is required');
      }

      const progress = await writeProgressService.saveProgress(
        childId,
        activityId,
        Boolean(isCompleted),
        score !== undefined ? Number(score) : undefined
      );
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeWrite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { activityId, score } = req.body;
      if (!activityId) {
        throw new ValidationError('activityId is required');
      }

      const progress = await writeProgressService.completeWrite(
        childId,
        activityId,
        score !== undefined ? Number(score) : undefined
      );
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const writeProgressController = new WriteProgressController();
