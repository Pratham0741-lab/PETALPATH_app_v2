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
import { z } from 'zod';

const subjectIdParamSchema = z.object({ subjectId: z.string().uuid('subjectId must be a UUID') });
const skillIdBodySchema = z.object({ skillId: z.string().uuid('skillId must be a UUID') });

import { curriculumLoader } from './curriculum-loader.js';

export class CurriculumController {
  async getCurriculum(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      // Automatically sync curriculum state to keep data fresh
      try {
        await curriculumEngineService.generateCurriculum(childId);
      } catch (e) {
        // Ignore errors if DB is unseeded
      }

      const subjects = await subjectRepository.findAll();
      const curriculumTree = [];

      if (!subjects || subjects.length === 0) {
        // Failsafe: Synthesize from static curriculum JSON configuration
        const allCurricula = curriculumLoader.loadAllCurricula();
        const subjectMap = new Map<string, any[]>();
        
        for (const cur of allCurricula.values()) {
          for (const theme of cur.themes) {
            for (const node of theme.nodes) {
              const subjName = node.curriculum.subject || 'General';
              if (!subjectMap.has(subjName)) {
                subjectMap.set(subjName, []);
              }
              subjectMap.get(subjName)!.push({
                id: node.id,
                name: node.title,
                description: node.curriculum.learning_outcome,
                difficulty: node.difficulty,
                estimatedAge: 4,
                isRootSkill: node.prerequisites.length === 0,
                subjectId: `subj_${subjName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                skillCode: node.id,
                state: CurriculumState.AVAILABLE,
                unlockRatio: 1.0,
                masteryScore: 0.0,
                masteryState: null,
              });
            }
          }
        }

        const fallbackTree = Array.from(subjectMap.entries()).map(([name, skills], idx) => ({
          id: `subj_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name,
          description: `${name} learning skills and activities`,
          icon: 'book',
          color: '#8B78D8',
          displayOrder: idx + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          skills,
        }));

        return res.status(200).json({
          success: true,
          data: fallbackTree,
        });
      }

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

      const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 3, 1), 50);
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

      const parsed = subjectIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const subject = await subjectRepository.findById(parsed.data.subjectId);
      if (!subject) {
        throw new NotFoundError('Subject not found');
      }

      const skills = await skillRepository.findBySubject(parsed.data.subjectId);

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

      const parsed = skillIdBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const updated = await curriculumEngineService.activateSkill(childId, parsed.data.skillId);

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

      const parsed = skillIdBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const updated = await curriculumEngineService.completeSkill(childId, parsed.data.skillId);

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
