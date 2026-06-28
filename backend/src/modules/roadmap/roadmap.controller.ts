import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { roadmapService } from './roadmap.service.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class RoadmapController {
  async getRoadmap(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const roadmapData = await roadmapService.getRoadmap(childId);
      return res.status(200).json({
        success: true,
        data: roadmapData,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const roadmapController = new RoadmapController();
