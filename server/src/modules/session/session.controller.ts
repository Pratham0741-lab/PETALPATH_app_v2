import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { sessionPlannerService } from './session-planner.service.js';
import { sessionPlanRepository } from './repositories/session-plan.repository.js';
import { sessionEventRepository } from './repositories/session-event.repository.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { z } from 'zod';

const blockActionSchema = z.object({
  blockId: z.string().uuid(),
});

export class SessionController {
  async generateSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      // Check if there is an active session already
      const activeSession = await sessionPlanRepository.findActiveSession(childId);
      if (activeSession) {
        return res.status(200).json({
          success: true,
          message: 'An active session plan already exists for today.',
          data: activeSession,
        });
      }

      const session = await sessionPlannerService.generateSession(childId);

      return res.status(201).json({
        success: true,
        message: 'Personalized session generated successfully.',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTodaySession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const activeSession = await sessionPlanRepository.findActiveSession(childId);
      if (!activeSession) {
        return res.status(200).json({
          success: true,
          message: 'No active session plan found.',
          data: null,
        });
      }

      return res.status(200).json({
        success: true,
        data: activeSession,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessionById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Session ID parameter is required.');
      }

      const session = await sessionPlanRepository.findById(id);
      if (!session) {
        throw new NotFoundError('Session plan not found.');
      }

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async startSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.body;
      if (!id) {
        throw new ValidationError('Session ID is required in body.');
      }

      const session = await sessionPlannerService.startSession(id);

      return res.status(200).json({
        success: true,
        message: 'Session started.',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async pauseSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.body;
      if (!id) {
        throw new ValidationError('Session ID is required in body.');
      }

      const session = await sessionPlannerService.pauseSession(id);

      return res.status(200).json({
        success: true,
        message: 'Session paused.',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async resumeSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.body;
      if (!id) {
        throw new ValidationError('Session ID is required in body.');
      }

      const session = await sessionPlannerService.resumeSession(id);

      return res.status(200).json({
        success: true,
        message: 'Session resumed.',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.body;
      if (!id) {
        throw new ValidationError('Session ID is required in body.');
      }

      const session = await sessionPlannerService.completeSession(id);

      return res.status(200).json({
        success: true,
        message: 'Session completed.',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async abandonSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.body;
      if (!id) {
        throw new ValidationError('Session ID is required in body.');
      }

      const session = await sessionPlannerService.abandonSession(id);

      return res.status(200).json({
        success: true,
        message: 'Session abandoned.',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeBlock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = blockActionSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid block action format', result.error.format());
      }

      const block = await sessionPlannerService.completeBlock(id, result.data.blockId);

      return res.status(200).json({
        success: true,
        message: 'Block completed.',
        data: block,
      });
    } catch (error) {
      next(error);
    }
  }

  async skipBlock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = blockActionSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid block action format', result.error.format());
      }

      const block = await sessionPlannerService.skipBlock(id, result.data.blockId);

      return res.status(200).json({
        success: true,
        message: 'Block skipped.',
        data: block,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const history = await sessionPlanRepository.findHistory(childId, limit);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const events = await sessionEventRepository.findByChild(childId, limit);

      return res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const sessionController = new SessionController();
