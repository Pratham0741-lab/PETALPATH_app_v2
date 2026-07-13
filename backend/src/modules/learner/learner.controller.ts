/**
 * Learner Controller
 *
 * Thin HTTP glue: parses/validates request, delegates to LearnerFacade,
 * returns the standard success envelope.
 *
 * Response envelope matches the existing controllers in this codebase
 * (`{ success: true, data: ... }`) so clients see a consistent shape.
 * The design's uniform `{ data, meta }` envelope is reserved for Phase 2
 * when the FE integration ships.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { learnerFacadeService } from './learner-facade.service.js';
import { childIdParamSchema } from './learner.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class LearnerController {
  async getState(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid learner request', parsed.error.format());
      }
      const state = await learnerFacadeService.getLearnerState(parsed.data.childId);
      return res.status(200).json({
        success: true,
        data: state,
        meta: {
          generatedAt: new Date().toISOString(),
          learnerStateVersion: state.version,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecommendation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid learner request', parsed.error.format());
      }
      const recommendation = await learnerFacadeService.getNextRecommendation(
        parsed.data.childId
      );
      return res.status(200).json({
        success: true,
        data: recommendation,
        meta: {
          generatedAt: recommendation.computedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const learnerController = new LearnerController();
