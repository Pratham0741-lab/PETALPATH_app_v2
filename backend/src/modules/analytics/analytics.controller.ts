import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { analyticsService } from './analytics.service.js';
import { analyticsHistoryRepository } from './repositories/analytics-history.repository.js';
import { trendEventRepository } from './repositories/trend-event.repository.js';
import { subjectAnalyticsRepository } from './repositories/subject-analytics.repository.js';
import { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { prisma } from '../../config/database.js';
import { z } from 'zod';
import {
  overviewQuerySchema,
  activityQuerySchema,
  progressQuerySchema,
  rewardsQuerySchema,
  timelineQuerySchema,
} from './analytics.validators.js';

const reportQuerySchema = z.object({
  window: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'LIFETIME']).optional().default('WEEKLY'),
});

/**
 * Resolves the child context for parent-facing analytics endpoints.
 * Defaults to the JWT's active child (selected profile) and, optionally,
 * accepts an explicit `childId` query param — both paths enforce ownership
 * (the child must belong to the authenticated user), reusing the same
 * IDOR safeguard semantics as `assertChildOwnership`.
 */
async function resolveChildId(req: AuthenticatedRequest): Promise<string> {
  if (!req.user?.userId) {
    throw new UnauthorizedError('Authentication required');
  }
  const requested = typeof req.query.childId === 'string' ? req.query.childId : undefined;
  const childId = requested ?? req.user.childId;
  if (!childId) {
    throw new UnauthorizedError('Active child profile is not selected');
  }
  const child = await prisma.child.findFirst({
    where: { id: childId, deletedAt: null },
    select: { userId: true },
  });
  if (!child) {
    throw new NotFoundError('Child profile not found');
  }
  if (child.userId !== req.user.userId) {
    throw new ForbiddenError('Not authorized for this child profile');
  }
  return childId;
}

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

      const parsed = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const history = await analyticsHistoryRepository.findByChild(childId, parsed.data.limit);

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

      const parsed = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const trends = await trendEventRepository.findByChild(childId, parsed.data.limit);

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

  // ──────────────────────────────────────────────
  //  PARENT-FACING AGGREGATED ANALYTICS (Phase 3.3)
  // ──────────────────────────────────────────────

  async getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = overviewQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const childId = await resolveChildId(req);
      const metrics = await analyticsService.getOverview(childId);
      return res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = activityQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const childId = await resolveChildId(req);
      const series = await analyticsService.getActivity(childId, parsed.data.period);
      return res.status(200).json({
        success: true,
        data: series,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = progressQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const childId = await resolveChildId(req);
      const summary = await analyticsService.getProgress(childId);
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Grade-scoped progress for the parent-locked analysis panel behind Explore:
   * accuracy by subject, mastery over time, and before/after. Ownership is
   * enforced by `resolveChildId`, exactly like the other parent-facing reads.
   */
  async getGradeProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = await resolveChildId(req);
      const data = await analyticsService.getGradeProgress(childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getRewards(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = rewardsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const childId = await resolveChildId(req);
      const summary = await analyticsService.getRewards(childId);
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = timelineQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const childId = await resolveChildId(req);
      const result = await analyticsService.getTimeline(childId, parsed.data.page, parsed.data.limit);
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLearnerAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = z.object({ childId: z.string().uuid() }).safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid childId parameter', parsed.error.format());
      }
      const data = await analyticsService.getLearnerAnalytics(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLearnerTrends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = z.object({ childId: z.string().uuid() }).safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid childId parameter', parsed.error.format());
      }
      const data = await analyticsService.getLearnerTrends(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getClassroomAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = z.object({ classroomId: z.string().uuid() }).safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid classroomId parameter', parsed.error.format());
      }
      const data = await analyticsService.getClassroomAnalytics(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getClassroomTrends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = z.object({ classroomId: z.string().uuid() }).safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid classroomId parameter', parsed.error.format());
      }
      const data = await analyticsService.getClassroomTrends(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getCurriculumAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = z.object({ gradeId: z.string() }).safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid gradeId parameter', parsed.error.format());
      }
      const teacherUserId = req.user?.role === 'TEACHER' || req.user?.role === 'MENTOR'
        ? req.user.userId
        : undefined;
      const data = await analyticsService.getCurriculumAnalytics(parsed.data.gradeId, teacherUserId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAssessmentAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = z.object({ assessmentId: z.string() }).safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid assessmentId parameter', parsed.error.format());
      }
      const teacherUserId = req.user?.role === 'TEACHER' || req.user?.role === 'MENTOR'
        ? req.user.userId
        : undefined;
      const data = await analyticsService.getAssessmentAnalytics(parsed.data.assessmentId, teacherUserId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
