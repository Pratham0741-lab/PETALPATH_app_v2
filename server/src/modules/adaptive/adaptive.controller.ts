import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { adaptiveLearningEngineService } from './adaptive-learning-engine.service.js';
import { learningProfileRepository } from './repositories/learning-profile.repository.js';
import { modalityPerformanceRepository } from './repositories/modality-performance.repository.js';
import { adaptationEventRepository } from './repositories/adaptation-event.repository.js';
import { skillHealthRepository } from '../mastery/repositories/skill-health.repository.js';
import { masteryEngineService } from '../mastery/mastery.service.js';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';
import { ActivityType } from '@prisma/client';
import { z } from 'zod';

const processPerformanceSchema = z.object({
  skillId: z.string().uuid(),
  accuracy: z.number().min(0).max(100),
  responseTime: z.number().nonnegative(),
  attempts: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  engagementScore: z.number().min(0).max(100),
  helpRequests: z.number().int().nonnegative(),
  sessionDuration: z.number().nonnegative(), // in minutes
  activityType: z.nativeEnum(ActivityType),
});

export class AdaptiveController {
  async processPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = processPerformanceSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid performance data format', result.error.format());
      }

      const payload = result.data;

      // 1. Fetch previous health record before update
      const previousHealth = await skillHealthRepository.findByChildAndSkill(childId, payload.skillId);

      // 2. Call Mastery Engine first to update skill health metrics
      const updatedHealth = await masteryEngineService.processPerformance(childId, payload.skillId, {
        accuracy: payload.accuracy,
        responseTime: payload.responseTime,
        attempts: payload.attempts,
        retries: payload.retries,
        engagementScore: payload.engagementScore,
        helpRequests: payload.helpRequests,
        sessionDuration: payload.sessionDuration * 60, // convert minutes to seconds
        timestamp: new Date().toISOString(),
      });

      // 3. Process Adaptive Learning Engine updates
      const adaptation = await adaptiveLearningEngineService.processChildPerformance(
        childId,
        payload,
        updatedHealth,
        previousHealth
      );

      return res.status(200).json({
        success: true,
        data: {
          health: updatedHealth,
          adaptation,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const profile = await learningProfileRepository.findByChildId(childId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async getModalityPerformances(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const modalities = await modalityPerformanceRepository.findByChild(childId);

      return res.status(200).json({
        success: true,
        data: modalities,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const preferredModality = await adaptiveLearningEngineService.recommendModality(childId);
      const optimalSessionDuration = await adaptiveLearningEngineService.recommendSessionDuration(childId);

      return res.status(200).json({
        success: true,
        data: {
          preferredModality,
          optimalSessionDuration,
          reason: `Dynamic optimization recommends ${preferredModality} activities with target session lengths of ${optimalSessionDuration} minutes based on child performance history.`,
        },
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
      const events = await adaptationEventRepository.findByChild(childId, limit);

      return res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adaptiveController = new AdaptiveController();
