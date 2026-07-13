import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth.middleware.js';
import { ObservationEngine, ObservationEventInput } from '../../application/services/observation-engine.service.js';
import { EvidenceProcessor } from '../../application/services/evidence-processor.service.js';
import { ValidationError, UnauthorizedError } from '../../../../utils/errors.js';
import { createObservationEventSchema, getTopicStatesSchema } from '../validators/observation-engine.validators.js';

export class ObservationEngineController {
  constructor(
    private readonly observationEngine: ObservationEngine,
    private readonly evidenceProcessor: EvidenceProcessor
  ) {}

  async observe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const parseResult = createObservationEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid observation event data', parseResult.error.format());
      }

      const event: ObservationEventInput = {
        ...parseResult.data,
        childId,
      };

      const observation = await this.observationEngine.observe(event);
      
      return res.status(200).json({
        success: true,
        data: observation,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopicStates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const parseResult = getTopicStatesSchema.safeParse(req.query);
      if (!parseResult.success) {
        throw new ValidationError('Invalid query parameters', parseResult.error.format());
      }

      // TODO: Implement topic states retrieval
      return res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }
}