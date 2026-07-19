import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { teacherDashboardService } from './teacher-dashboard.service.js';
import { dashboardService } from '../dashboard/dashboard.service.js';
import { classroomIdParamSchema, classroomLearnerParamSchema } from './teacher-dashboard.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class TeacherDashboardController {
  async getClassroomDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getClassroomDashboard(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getClassroomProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getClassroomProgress(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLearnerProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomLearnerParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getLearnerProgress(
        parsed.data.classroomId,
        parsed.data.childId
      );
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getClassroomThemeProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getClassroomThemeProgress(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getClassroomSubjectProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getClassroomSubjectProgress(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getClassroomAssessmentSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getClassroomAssessmentSummary(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getClassroomMasterySummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getClassroomMasterySummary(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLearnerAssessmentSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomLearnerParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getLearnerAssessmentSummary(
        parsed.data.classroomId,
        parsed.data.childId
      );
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLearnerHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomLearnerParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      // Delegates child-level history to the parent dashboard helper
      const data = await dashboardService.getLearningHistory(parsed.data.childId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getClassroomAchievements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = classroomIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid request parameters', parsed.error.format());
      }
      const data = await teacherDashboardService.getClassroomAchievements(parsed.data.classroomId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const teacherDashboardController = new TeacherDashboardController();
