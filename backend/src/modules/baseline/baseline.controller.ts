import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { UnauthorizedError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { baselineService, BaselineService } from './baseline.service.js';
import { BaselineBodySchema, ConsentBodySchema } from './baseline.validators.js';

export class BaselineController {
  constructor(private readonly service: BaselineService = baselineService) {}

  save = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = BaselineBodySchema.safeParse(req.body);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        throw new ValidationError(firstIssue?.message || 'Validation failed', parsed.error.format());
      }
      const childId = req.params.childId as string;
      const { baseline, created } = await this.service.save(childId, parsed.data);
      logger.info({ childId, skipped: baseline.skipped, created }, 'Baseline saved');
      return res.status(created ? 201 : 200).json({ success: true, data: baseline });
    } catch (error) {
      next(error);
    }
  };

  get = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const baseline = await this.service.get(req.params.childId as string);
      return res.status(200).json({ success: true, data: baseline });
    } catch (error) {
      next(error);
    }
  };

  /** POST /auth/consent — parental consent to store child data. */
  consent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) throw new UnauthorizedError('Authentication required');
      const parsed = ConsentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed', parsed.error.format());
      }
      const data = await this.service.recordConsent(req.user.userId, parsed.data.version);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const baselineController = new BaselineController();
