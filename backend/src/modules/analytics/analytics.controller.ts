import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { analyticsService } from './analytics.service.js';
import { analyticsHistoryRepository } from './repositories/analytics-history.repository.js';
import { trendEventRepository } from './repositories/trend-event.repository.js';
import { subjectAnalyticsRepository } from './repositories/subject-analytics.repository.js';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';
import { z } from 'zod';

const reportQuerySchema = z.object({
  window: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'LIFETIME']).optional().default('WEEKLY'),
});

export class AnalyticsController {
  async getSnapshot(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      // Generate/update fresh snapshot and histories
      const snapshot = await analyticsService.generateSnapshot(childId);

      return res.status(200).json({
        success: true,
        data: snapshot,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = await analyticsHistoryRepository.findByChild(childId, limit);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const trends = await trendEventRepository.findByChild(childId, limit);

      return res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      // Trigger recalculation to keep subject analytics fresh
      await analyticsService.calculateSubjectAnalytics(childId);
      const subjects = await subjectAnalyticsRepository.findByChild(childId);

      return res.status(200).json({
        success: true,
        data: subjects,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInsights(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const insights = await analyticsService.generateInsights(childId);

      return res.status(200).json({
        success: true,
        data: insights,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = reportQuerySchema.safeParse(req.query);
      if (!result.success) {
        throw new ValidationError('Invalid report query format', result.error.format());
      }

      // Automatically refresh snapshot before generating reports to keep metrics fresh
      await analyticsService.generateSnapshot(childId);

      const report = await analyticsService.generateReports(childId, result.data.window);

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
