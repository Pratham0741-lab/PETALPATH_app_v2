import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { placementService } from './placement.service.js';
import {
  chooseQuestionnaireSchema,
  startPlacementSchema,
  startFromBeginningSchema,
  submitAnswerSchema,
  completePlacementSchema,
} from './placement.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class PlacementController {
  async getQuestionnaire(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = chooseQuestionnaireSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await placementService.getQuestionnaire(parsed.data.ageGroup, parsed.data.startFromBeginning);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async startPlacement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = startPlacementSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await placementService.startPlacement(parsed.data.childId, parsed.data.assessmentId);

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async startFromBeginning(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = startFromBeginningSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await placementService.startFromBeginning(parsed.data.childId);

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async submitAnswer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId || typeof childId !== 'string') {
        throw new ValidationError('Child ID is required');
      }

      const parsed = submitAnswerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await placementService.submitAnswer(
        childId,
        parsed.data.attemptId,
        parsed.data.questionId,
        parsed.data.answer
      );

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async completePlacement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId || typeof childId !== 'string') {
        throw new ValidationError('Child ID is required');
      }

      const parsed = completePlacementSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await placementService.completePlacement(childId, parsed.data.attemptId);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPlacementResult(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId, attemptId } = req.params;
      if (!childId || !attemptId || typeof childId !== 'string' || typeof attemptId !== 'string') {
        throw new ValidationError('Child ID and attempt ID are required');
      }

      const result = await placementService.getPlacementResult(childId, attemptId);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async restartPlacement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId || typeof childId !== 'string') {
        throw new ValidationError('Child ID is required');
      }

      await placementService.restartPlacement(childId);

      return res.status(200).json({ success: true, data: { message: 'Placement restarted successfully' } });
    } catch (error) {
      next(error);
    }
  }
}

export const placementController = new PlacementController();
