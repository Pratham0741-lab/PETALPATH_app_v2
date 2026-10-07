import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { feedbackService, FeedbackService } from './feedback.service.js';
import { SubmitFeedbackSchema } from './feedback.validators.js';
import { UnauthorizedError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class FeedbackController {
  constructor(private readonly service: FeedbackService = feedbackService) {}

  submit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) throw new UnauthorizedError('Authentication required');

      const parsed = SubmitFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        throw new ValidationError(firstIssue?.message || 'Validation failed', parsed.error.format());
      }

      const result = await this.service.submit(req.user.userId, req.user.childId, parsed.data);

      // No comment text in logs: it is free text from a parent.
      logger.info(
        {
          feedbackId: result.feedback.id,
          lessonId: result.feedback.lessonId,
          rating: result.feedback.rating,
          created: result.created,
        },
        'Lesson feedback saved',
      );

      return res.status(result.created ? 201 : 200).json({ success: true, data: result.feedback });
    } catch (error) {
      next(error);
    }
  };
}

export const feedbackController = new FeedbackController();
