import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { masteryEngineService } from './mastery.service.js';
import { updateMasterySchema } from './mastery.validator.js';
import { skillHealthRepository } from './repositories/skill-health.repository.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { prisma } from '../../config/database.js';

export class MasteryController {
  async updatePerformance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = updateMasterySchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid performance data format', result.error.format());
      }

      const { childId: bodyChildId, skillId, performance } = result.data;
      const childId = bodyChildId || req.user?.childId;

      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      if (bodyChildId && req.user) {
        const child = await prisma.child.findFirst({
          where: { id: childId, userId: req.user.userId, deletedAt: null },
        });
        if (!child) {
          throw new UnauthorizedError('Child profile not found or access denied');
        }
      }

      const updatedHealth = await masteryEngineService.processPerformance(childId, skillId, performance);

      return res.status(200).json({
        success: true,
        data: updatedHealth,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSkillHealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { skillId } = req.params;
      if (!skillId) {
        throw new ValidationError('skillId parameter is required');
      }

      const health = await skillHealthRepository.findByChildAndSkill(childId, skillId);

      return res.status(200).json({
        success: true,
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChildSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId) {
        throw new ValidationError('childId parameter is required');
      }

      if (req.user) {
        const child = await prisma.child.findFirst({
          where: { id: childId, userId: req.user.userId, deletedAt: null },
        });
        if (!child) {
          throw new NotFoundError('Child profile not found');
        }
      }

      const skills = await skillHealthRepository.findByChild(childId);

      return res.status(200).json({
        success: true,
        data: skills,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWeakSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const weakSkills = await skillHealthRepository.findWeakSkills(childId);

      return res.status(200).json({
        success: true,
        data: weakSkills,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const masteryController = new MasteryController();
