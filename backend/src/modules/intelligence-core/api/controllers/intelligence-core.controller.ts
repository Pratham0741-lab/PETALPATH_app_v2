import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth.middleware.js';
import { ObservationEngine, ObservationEventInput } from '../../application/services/observation-engine.service.js';
import { EvidenceProcessor } from '../../application/services/evidence-processor.service.js';
import { ClassificationEngine } from '../../application/services/classification-engine.service.js';
import { ValidationError, UnauthorizedError } from '../../../../utils/errors.js';
import {
  observeEventSchema,
  getTopicStatesSchema,
  getKnowledgeStatesSchema,
  classifyChildSchema,
} from '../validators/intelligence-core.validators.js';

export class IntelligenceCoreController {
  constructor(
    private readonly observationEngine: ObservationEngine,
    private readonly evidenceProcessor: EvidenceProcessor,
    private readonly classificationEngine: ClassificationEngine,
  ) {}

  async observeEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = observeEventSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid event data', result.error.format());
      }

      const input: ObservationEventInput = {
        ...result.data,
        childId,
      };

      const observation = await this.observationEngine.observe(input);

      return res.status(201).json({
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

      const result = getTopicStatesSchema.safeParse({ childId });
      if (!result.success) {
        throw new ValidationError('Invalid parameters', result.error.format());
      }

      return res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }

  async getKnowledgeStates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = getKnowledgeStatesSchema.safeParse({ childId });
      if (!result.success) {
        throw new ValidationError('Invalid parameters', result.error.format());
      }

      return res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }

  async classifyChild(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = classifyChildSchema.safeParse({ childId });
      if (!result.success) {
        throw new ValidationError('Invalid parameters', result.error.format());
      }

      return res.status(200).json({
        success: true,
        data: {
          topicStates: [],
          knowledgeStates: [],
        },
      });
    } catch (error) {
      next(error);
    }
  }
}