import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { skillRoadmapService } from './skill-roadmap.service.js';
import { ValidationError } from '../../utils/errors.js';
import { sectionParamSchema } from './skill-roadmap.validator.js';

export class SkillRoadmapController {
  async getRoadmap(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId) throw new ValidationError('Child ID is required');

      const roadmap = await skillRoadmapService.getRoadmap(childId);
      return res.status(200).json({ success: true, data: roadmap });
    } catch (error) {
      next(error);
    }
  }

  async refreshRoadmap(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId) throw new ValidationError('Child ID is required');

      const trigger = req.body?.trigger as string | undefined;
      const roadmap = await skillRoadmapService.refreshRoadmap(childId, trigger as any);
      return res.status(200).json({ success: true, data: roadmap });
    } catch (error) {
      next(error);
    }
  }

  async getSection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId, section } = req.params;
      if (!childId || !section) throw new ValidationError('Child ID and section are required');

      const parsed = sectionParamSchema.safeParse({ section });
      if (!parsed.success) {
        throw new ValidationError('Invalid section type', parsed.error.format());
      }

      const result = await skillRoadmapService.getSection(childId, parsed.data.section);
      if (!result) {
        return res.status(200).json({ success: true, data: { type: parsed.data.section, title: '', skills: [] } });
      }
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUnlockedSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId) throw new ValidationError('Child ID is required');

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await skillRoadmapService.getUnlockedSkills(childId, page, pageSize);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLockedSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId) throw new ValidationError('Child ID is required');

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await skillRoadmapService.getLockedSkills(childId, page, pageSize);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getReviewSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId) throw new ValidationError('Child ID is required');

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await skillRoadmapService.getReviewSkills(childId, page, pageSize);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getNextSkill(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId) throw new ValidationError('Child ID is required');

      const result = await skillRoadmapService.getNextSkill(childId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getDailyQueue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId } = req.params;
      if (!childId) throw new ValidationError('Child ID is required');

      const maxItems = parseInt(req.query.maxItems as string) || 5;
      const result = await skillRoadmapService.getDailyQueue(childId, maxItems);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async unlockDownstream(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { childId, skillId } = req.params;
      if (!childId || !skillId) throw new ValidationError('Child ID and skill ID are required');

      const unlocked = await skillRoadmapService.unlockDownstream(childId, skillId);
      return res.status(200).json({ success: true, data: { unlocked } });
    } catch (error) {
      next(error);
    }
  }
}

export const skillRoadmapController = new SkillRoadmapController();
