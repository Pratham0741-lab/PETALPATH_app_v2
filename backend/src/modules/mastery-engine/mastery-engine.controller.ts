import type { Request, Response } from 'express';
import { masteryEngineService } from './mastery-engine.service.js';
import { evaluateMasterySchema, processRevisionSchema, skillIdParamSchema } from './mastery-engine.validator.js';
import { ValidationError, getErrorStatusCode } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type { EvaluateMasteryInput, ProcessRevisionInput } from './mastery-engine.types.js';

export class MasteryEngineController {
  async evaluateMastery(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const validation = evaluateMasterySchema.safeParse({ childId, ...req.body });
      if (!validation.success) {
        throw new ValidationError(validation.error.errors.map((e) => e.message).join(', '));
      }

      const result = await masteryEngineService.evaluateMastery(validation.data as EvaluateMasteryInput);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId }, 'Mastery evaluation failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Mastery evaluation failed';
      res.status(status).json({ success: false, message });
    }
  }

  async recalculateMastery(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const skillId = req.params.skillId;
      const paramValidation = skillIdParamSchema.safeParse({ skillId });
      if (!paramValidation.success) {
        throw new ValidationError(paramValidation.error.errors.map((e) => e.message).join(', '));
      }

      const result = await masteryEngineService.recalculateMastery(childId, skillId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId, skillId: req.params.skillId }, 'Mastery recalculation failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Mastery recalculation failed';
      res.status(status).json({ success: false, message });
    }
  }

  async getSkillMastery(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const skillId = req.params.skillId;

      const result = await masteryEngineService.getSkillMastery(childId, skillId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId, skillId: req.params.skillId }, 'Get skill mastery failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Failed to get skill mastery';
      res.status(status).json({ success: false, message });
    }
  }

  async getSkillHistory(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const skillId = req.params.skillId;

      const result = await masteryEngineService.getSkillHistory(childId, skillId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId, skillId: req.params.skillId }, 'Get skill history failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Failed to get skill history';
      res.status(status).json({ success: false, message });
    }
  }

  async getRevisionQueue(req: Request, res: Response) {
    try {
      const childId = req.params.childId;

      const result = await masteryEngineService.getRevisionQueue(childId);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId }, 'Get revision queue failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Failed to get revision queue';
      res.status(status).json({ success: false, message });
    }
  }

  async processRevision(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const validation = processRevisionSchema.safeParse({ childId, ...req.body });
      if (!validation.success) {
        throw new ValidationError(validation.error.errors.map((e) => e.message).join(', '));
      }

      const result = await masteryEngineService.processRevision(validation.data as ProcessRevisionInput);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId }, 'Revision processing failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Revision processing failed';
      res.status(status).json({ success: false, message });
    }
  }
}

export const masteryEngineController = new MasteryEngineController();
