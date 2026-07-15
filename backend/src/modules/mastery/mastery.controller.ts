import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { masteryEngineService } from './mastery.service.js';
import { updateMasterySchema } from './mastery.validator.js';
import { skillHealthRepository } from './repositories/skill-health.repository.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { prisma } from '../../config/database.js';
import { z } from 'zod';

const skillIdParamSchema = z.object({ skillId: z.string().uuid('skillId must be a UUID') });
const childIdParamSchema = z.object({ childId: z.string().uuid('childId must be a UUID') });

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

      const parsed = skillIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const health = await skillHealthRepository.findByChildAndSkill(childId, parsed.data.skillId);

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
      const parsed = childIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      if (req.user) {
        const child = await prisma.child.findFirst({
          where: { id: parsed.data.childId, userId: req.user.userId, deletedAt: null },
        });
        if (!child) {
          throw new NotFoundError('Child profile not found');
        }
      }

      const skills = await skillHealthRepository.findByChild(parsed.data.childId);

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
