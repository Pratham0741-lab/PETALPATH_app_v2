import type { Request, Response } from 'express';
import { aiTutorService } from './ai-tutor.service.js';
import {
  startSessionSchema,
  resumeSessionSchema,
  endSessionSchema,
  recordProgressSchema,
} from './ai-tutor.validator.js';
import { getErrorStatusCode, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class AiTutorController {
  async startSession(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const parsed = startSessionSchema.safeParse({
        childId,
        durationMinutes: req.body.durationMinutes,
      });
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const result = await aiTutorService.startSession(parsed.data);
      res.status(201).json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId }, 'Start session failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Start session failed';
      res.status(status).json({ success: false, message });
    }
  }

  async resumeSession(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const parsed = resumeSessionSchema.safeParse({
        childId,
        sessionId: req.params.sessionId,
      });
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const result = await aiTutorService.resumeSession(parsed.data);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId, sessionId: req.params.sessionId }, 'Resume session failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Resume session failed';
      res.status(status).json({ success: false, message });
    }
  }

  async endSession(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const parsed = endSessionSchema.safeParse({
        childId,
        sessionId: req.params.sessionId,
      });
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const result = await aiTutorService.endSession(parsed.data);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId, sessionId: req.params.sessionId }, 'End session failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'End session failed';
      res.status(status).json({ success: false, message });
    }
  }

  async getNextActivity(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      if (!childId) {
        throw new ValidationError('Missing childId');
      }
      const { sessionId } = req.params;
      if (!sessionId) {
        throw new ValidationError('sessionId is required');
      }
      const result = await aiTutorService.getNextActivity(sessionId, childId);
      if (!result) {
        res.status(404).json({ success: false, message: 'No incomplete activities found' });
        return;
      }
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Get next activity failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Get next activity failed';
      res.status(status).json({ success: false, message });
    }
  }

  async recordProgress(req: Request, res: Response) {
    try {
      const childId = req.params.childId;
      const parsed = recordProgressSchema.safeParse({
        childId,
        sessionId: req.params.sessionId,
        blockId: req.body.blockId,
        skillId: req.body.skillId,
        accuracy: req.body.accuracy,
        responseTime: req.body.responseTime,
        attempts: req.body.attempts,
        retries: req.body.retries,
        engagementScore: req.body.engagementScore,
        helpRequests: req.body.helpRequests,
        sessionDuration: req.body.sessionDuration,
      });
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
      }
      const result = await aiTutorService.recordProgress(parsed.data);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error({ error, childId: req.params.childId, sessionId: req.params.sessionId }, 'Record progress failed');
      const status = getErrorStatusCode(error);
      const message = error instanceof Error ? error.message : 'Record progress failed';
      res.status(status).json({ success: false, message });
    }
  }
}

export const aiTutorController = new AiTutorController();
