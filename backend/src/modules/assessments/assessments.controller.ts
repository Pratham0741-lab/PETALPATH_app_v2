import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { assessmentsService } from './assessments.service.js';
import {
  createAssessmentSchema,
  startAttemptSchema,
  submitAttemptSchema,
} from './assessments.validator.js';
import { ValidationError, ForbiddenError, UnauthorizedError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { lessonAccessService } from '../lessons/lesson-access.service.js';

export class AssessmentsController {
  async listAssessments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const assessments = await assessmentsService.listAssessments();
      return res.status(200).json({
        success: true,
        data: assessments,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const assessment = await assessmentsService.getAssessment(id);
      return res.status(200).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLessonAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { lessonId } = req.params;

      // Validate access to the lesson (locked / grade match checks)
      await lessonAccessService.validateLessonAccess(childId, lessonId);

      const assessment = await assessmentsService.getAssessment(lessonId);
      return res.status(200).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  }

  async createAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return next(new ForbiddenError('Only administrators can create assessments'));
      }
      const parsed = createAssessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const assessment = await assessmentsService.createAssessment(parsed.data);
      logger.info({ assessmentId: assessment.id }, 'assessment created');
      return res.status(201).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  }

  async startAttempt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      const parsed = startAttemptSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const attempt = await assessmentsService.startAttempt(childId, parsed.data.assessmentId);
      return res.status(201).json({
        success: true,
        data: attempt,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitAttempt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId, attemptId } = req.params;
      const parsed = submitAttemptSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const attempt = await assessmentsService.submitAttempt(childId, attemptId, parsed.data);
      return res.status(200).json({
        success: true,
        data: attempt,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAttemptHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      const assessmentId =
        typeof req.query.assessmentId === 'string' ? req.query.assessmentId : undefined;
      const attempts = await assessmentsService.getAttemptHistory(childId, assessmentId);
      return res.status(200).json({
        success: true,
        data: attempts,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAttempt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId, attemptId } = req.params;
      const attempt = await assessmentsService.getAttempt(childId, attemptId);
      return res.status(200).json({
        success: true,
        data: attempt,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const assessmentsController = new AssessmentsController();
