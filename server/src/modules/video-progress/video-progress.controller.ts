import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { videoProgressService } from './video-progress.service.js';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';

export class VideoProgressController {
  async getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }
      
      const { videoId } = req.params;
      if (!videoId) {
        throw new ValidationError('videoId parameter is required');
      }

      const progress = await videoProgressService.getProgress(childId, videoId);
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

      const { videoId, watchPosition } = req.body;
      if (!videoId) {
        throw new ValidationError('videoId is required');
      }
      if (watchPosition === undefined || watchPosition === null) {
        throw new ValidationError('watchPosition is required');
      }

      const progress = await videoProgressService.saveProgress(childId, videoId, Number(watchPosition));
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeVideo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { videoId } = req.body;
      if (!videoId) {
        throw new ValidationError('videoId is required');
      }

      const progress = await videoProgressService.completeVideo(childId, videoId);
      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const videoProgressController = new VideoProgressController();
