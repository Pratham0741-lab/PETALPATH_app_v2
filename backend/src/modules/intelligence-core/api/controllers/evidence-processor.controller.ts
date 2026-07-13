import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth.middleware.js';
import { EvidenceProcessor } from '../../application/services/evidence-processor.service.js';
import { ValidationError, UnauthorizedError } from '../../../../utils/errors.js';
import { processEvidenceSchema, getMetricSnapshotsSchema } from '../validators/evidence-processor.validators.js';

export class EvidenceProcessorController {
  constructor(
    private readonly evidenceProcessor: EvidenceProcessor
  ) {}

  async process(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = processEvidenceSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid evidence processing request', result.error.format());
      }

      // TODO: Implement evidence processing
      return res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }

  async getMetricSnapshots(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = getMetricSnapshotsSchema.safeParse(req.query);
      if (!result.success) {
        throw new ValidationError('Invalid query parameters', result.error.format());
      }

      // TODO: Implement metric snapshots retrieval
      return res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }
}