import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { reinforcementEngineService } from './reinforcement-engine.service.js';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';
import { ActivityType } from '../../shared/enums.js';
import { z } from 'zod';

const processReinforcementSchema = z.object({
  skillId: z.string().uuid(),
  beforeScore: z.number().min(0).max(100),
  afterScore: z.number().min(0).max(100),
  activityType: z.nativeEnum(ActivityType),
});

export class ReinforcementController {
  async processReinforcement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = processReinforcementSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid reinforcement data format', result.error.format());
      }

      const { skillId, beforeScore, afterScore, activityType } = result.data;

      const outcome = await reinforcementEngineService.processReinforcement(
        childId,
        skillId,
        beforeScore,
        afterScore,
        activityType
      );

      return res.status(200).json({
        success: true,
        data: outcome,
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const queue = await reinforcementEngineService.getQueue(childId);

      return res.status(200).json({
        success: true,
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDueSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const dueSkills = await reinforcementEngineService.getDueSkills(childId);
      const enrichedSkills = [];

      for (const entry of dueSkills) {
        const activityType = await reinforcementEngineService.selectActivityType(childId, entry.skillId);
        enrichedSkills.push({
          ...entry,
          recommendedActivityType: activityType,
        });
      }

      return res.status(200).json({
        success: true,
        data: enrichedSkills,
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

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = await reinforcementEngineService.getHistory(childId, limit);

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
      const events = await reinforcementEngineService.getEvents(childId, limit);

      return res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reinforcementController = new ReinforcementController();
