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

  async getCurrentLesson(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const currentLesson = await roadmapService.getCurrentLesson(childId);
      return res.status(200).json({
        success: true,
        data: currentLesson,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentTheme(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const currentTheme = await roadmapService.getCurrentTheme(childId);
      return res.status(200).json({
        success: true,
        data: currentTheme,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentGrade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const currentGrade = await roadmapService.getCurrentGrade(childId);
      return res.status(200).json({
        success: true,
        data: currentGrade,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const roadmapController = new RoadmapController();
