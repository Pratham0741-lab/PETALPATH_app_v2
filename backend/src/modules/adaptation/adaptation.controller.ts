import type { Request, Response } from 'express';
import { adaptationService } from './adaptation.service.js';
import { analyzeAdaptationSchema, childIdParamSchema } from './adaptation.validator.js';
import { ValidationError, getErrorStatusCode } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class AdaptationController {
  async analyze(req: Request, res: Response) {
    try {
      const { childId } = req.params;
      const parsed = analyzeAdaptationSchema.safeParse({ childId, ...req.body });
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const result = await adaptationService.analyze(childId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId }, 'Adaptation analysis failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Adaptation analysis failed';
      res.status(status).json({ success: false, message });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const { childId } = req.params;
      const parsed = childIdParamSchema.safeParse({ childId });
      if (!parsed.success) {
        throw new ValidationError('Invalid child ID');
      }
      const result = await adaptationService.getProfile(childId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId }, 'Get adaptation profile failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Failed to get profile';
      res.status(status).json({ success: false, message });
    }
  }
}

export const adaptationController = new AdaptationController();
