import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { curriculumEngineService } from './curriculum-engine.service.js';
import { subjectRepository } from './repositories/subject.repository.js';
import { childSkillCurriculumRepository } from './repositories/child-skill-curriculum.repository.js';
import { skillRepository } from './repositories/skill.repository.js';
import { skillHealthRepository } from '../mastery/repositories/skill-health.repository.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { CurriculumState } from '../../shared/enums.js';

export class CurriculumController {
  async getCurriculum(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      // Automatically sync curriculum state to keep data fresh
      await curriculumEngineService.generateCurriculum(childId);

      const subjects = await subjectRepository.findAll();
      const curriculumTree = [];

      for (const subj of subjects) {
        const skills = await skillRepository.findBySubject(subj.id);

        const skillsWithState = [];
        for (const skill of skills) {
          const curState = await childSkillCurriculumRepository.findByChildAndSkill(childId, skill.id);
          const health = await skillHealthRepository.findByChildAndSkill(childId, skill.id);

          skillsWithState.push({
            ...skill,
            state: curState?.state ?? CurriculumState.LOCKED,
            unlockRatio: curState?.unlockRatio ?? 0.0,
            masteryScore: health?.masteryScore ?? 0.0,
            masteryState: health?.masteryState ?? null,
          });
        }

        curriculumTree.push({
          ...subj,
          skills: skillsWithState,
        });
      }

      return res.status(200).json({
        success: true,
        data: curriculumTree,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const available = await curriculumEngineService.getAvailableSkills(childId);

      return res.status(200).json({
        success: true,
        data: available,
      });
    } catch (error) {
      next(error);
    }
  }

  async getNextRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 3;
      const recommendations = await curriculumEngineService.recommendNextSkills(childId, limit);

      return res.status(200).json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubjectCurriculum(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { subjectId } = req.params;
      if (!subjectId) {
        throw new ValidationError('subjectId parameter is required');
      }

      const subject = await subjectRepository.findById(subjectId);
      if (!subject) {
        throw new NotFoundError('Subject not found');
      }

      const skills = await skillRepository.findBySubject(subjectId);

      const skillsWithState = [];
      for (const skill of skills) {
        const curState = await childSkillCurriculumRepository.findByChildAndSkill(childId, skill.id);
        const health = await skillHealthRepository.findByChildAndSkill(childId, skill.id);

        skillsWithState.push({
          ...skill,
          state: curState?.state ?? CurriculumState.LOCKED,
          unlockRatio: curState?.unlockRatio ?? 0.0,
          masteryScore: health?.masteryScore ?? 0.0,
          masteryState: health?.masteryState ?? null,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...subject,
          skills: skillsWithState,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async generateCurriculum(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.body.childId || req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const updated = await curriculumEngineService.generateCurriculum(childId);

      return res.status(200).json({
        success: true,
        message: 'Curriculum generated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateSkill(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { skillId } = req.body;
      if (!skillId) {
        throw new ValidationError('skillId is required');
      }

      const updated = await curriculumEngineService.activateSkill(childId, skillId);

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeSkill(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { skillId } = req.body;
      if (!skillId) {
        throw new ValidationError('skillId is required');
      }

      const updated = await curriculumEngineService.completeSkill(childId, skillId);

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const curriculumController = new CurriculumController();
