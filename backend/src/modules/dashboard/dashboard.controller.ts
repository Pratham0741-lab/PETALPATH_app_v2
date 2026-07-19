import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { dashboardService } from './dashboard.service.js';
import { childIdParamSchema } from './dashboard.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class DashboardController {
  async getDashboardOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getDashboardOverview(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getCurriculumProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getCurriculumProgress(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getThemeProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getThemeProgress(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSubjectProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getSubjectProgress(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAssessmentSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getAssessmentSummary(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMasterySummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getMasterySummary(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLearningHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getLearningHistory(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getEarnedRewards(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getEarnedRewards(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAchievements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await dashboardService.getAchievements(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
