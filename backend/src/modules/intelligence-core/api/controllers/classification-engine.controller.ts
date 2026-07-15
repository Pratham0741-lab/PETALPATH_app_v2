import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth.middleware.js';
import { ClassificationEngine } from '../../application/services/classification-engine.service.js';
import { ValidationError, UnauthorizedError } from '../../../../utils/errors.js';
import { classifyAllSchema, getClassificationResultSchema } from '../validators/classification-engine.validators.js';
import { MetricSnapshot, MetricCategory } from '../../domain/entities/metric-snapshot.entity.js';

export class ClassificationEngineController {
  constructor(
    private readonly classificationEngine: ClassificationEngine
  ) {}

  async classify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = classifyAllSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid classification request', result.error.format());
      }

      // Map request body to metric snapshots
      const metricSnapshots = result.data.metricSnapshots.map((ms: any) =>
        MetricSnapshot.create({
          childId,
          category: ms.category as MetricCategory,
          metrics: ms.metrics,
          calculationVersion: ms.calculationVersion || '1.0',
          windowStart: ms.windowStart ? new Date(ms.windowStart) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          windowEnd: ms.windowEnd ? new Date(ms.windowEnd) : new Date(),
        })
      );

      const classification = await this.classificationEngine.classifyAll(childId, metricSnapshots);

      return res.status(200).json({
        success: true,
        data: {
          topicStates: classification.topicStates,
          knowledgeStates: classification.knowledgeStates,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getClassificationResult(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = getClassificationResultSchema.safeParse(req.query);
      if (!result.success) {
        throw new ValidationError('Invalid query parameters', result.error.format());
      }

      return res.status(200).json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}