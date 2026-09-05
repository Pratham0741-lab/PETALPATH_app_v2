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
import { curriculumService } from './curriculum.service.js';
import { buildGarden, GardenSubjectInput, GardenSkillInput } from './garden-view.js';
import { buildProgressStory, StoryBossInput, StorySubjectInput } from './progress-story.js';

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

  /**
   * "Your Garden" — the child-facing mastery map behind the Explore tab.
   *
   * A superset of `getCurriculum`: same subjects, same per-child state, but every
   * skill also carries its live (decayed) mastery, its bloom stage and whether it
   * is thirsty, plus per-subject aggregates. The heavy lifting is the pure
   * `buildGarden`; this method only does the I/O and the unseeded failsafe, which
   * mirrors `getCurriculum`'s so the panorama renders before a single seed exists.
   */
  async getGarden(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      // Keep curriculum state fresh, exactly as getCurriculum does. Ignore when unseeded.
      try {
        await curriculumEngineService.generateCurriculum(childId);
      } catch (e) {
        // Ignore errors if DB is unseeded
      }

      const now = new Date();

      // Resolve which grade this child is in. The garden shows only *their* grade
      // (pre-nursery / nursery / lkg / ukg), never the whole four-grade catalog, so
      // "how am I doing" is answered against what the child is actually working on.
      const child = await prisma.child.findUnique({ where: { id: childId } });
      const gradeKey = curriculumService.resolveChildGrade({ ageGroup: child?.ageGroup ?? undefined });
      const gradeNumber = curriculumService.resolveChildGradeNumber({ ageGroup: child?.ageGroup ?? undefined });

      const subjects = await subjectRepository.findAll();

      // ---- Failsafe: nothing seeded -> a garden of seeds synthesized from static JSON ----
      if (!subjects || subjects.length === 0) {
        // Only the child's own grade curriculum, not every grade on disk.
        const gradeCurriculum = curriculumLoader.getCurriculumByGrade(gradeKey);
        const gradeCurricula = gradeCurriculum ? [gradeCurriculum] : [];
        const inputById = new Map<string, GardenSubjectInput>();
        const visualById = new Map<string, any>();

        for (const cur of gradeCurricula) {
          for (const theme of cur.themes) {
            for (const node of theme.nodes) {
              const subjName = node.curriculum.subject || 'General';
              const subjId = `subj_${subjName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
              if (!inputById.has(subjId)) {
                inputById.set(subjId, { id: subjId, name: subjName, skills: [] });
                visualById.set(subjId, {
                  id: subjId,
                  name: subjName,
                  description: `${subjName} learning skills and activities`,
                  icon: 'book',
                  color: '#8B78D8',
                  displayOrder: visualById.size + 1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
              (inputById.get(subjId)!.skills as GardenSkillInput[]).push({
                skillId: node.id,
                title: node.title,
                difficulty: node.difficulty,
                state: CurriculumState.AVAILABLE,
                health: null,
              });
            }
          }
        }

        const garden = buildGarden({ subjects: Array.from(inputById.values()), now });
        return res.status(200).json({
          success: true,
          data: {
            subjects: garden.subjects.map((gs) => ({ ...visualById.get(gs.id), ...gs })),
            totals: garden.totals,
          },
        });
      }

      // ---- Seeded: one bulk read of the child's whole state, then aggregate ----
      const [curriculumStates, healthRows] = await Promise.all([
        childSkillCurriculumRepository.findByChild(childId),
        skillHealthRepository.findByChild(childId),
      ]);
      const stateBySkill = new Map(curriculumStates.map((c) => [c.skillId, c.state]));
      const healthBySkill = new Map(healthRows.map((h) => [h.skillId, h]));
      const visualById = new Map(subjects.map((s) => [s.id, s]));

      // The child's grade, as its authoritative skill-code set (originalGrade is
      // null in the seeded data, so it can't be used). Empty means "don't filter".
      const gradeSkillCodes = curriculumService.getGradeSkillCodes(gradeKey);
      const inGrade = (skill: { skillCode: string; originalGrade: number | null }) =>
        gradeSkillCodes.size === 0 ||
        gradeSkillCodes.has(skill.skillCode) ||
        skill.originalGrade === gradeNumber;

      const subjectInputs: GardenSubjectInput[] = [];
      for (const subj of subjects) {
        const allSkills = await skillRepository.findBySubject(subj.id);
        // Two cuts: keep only this child's grade, and only what they are actually
        // working on — LOCKED skills are the future/other-grade catalog and the
        // garden should never show them. That is "their grade, what they've reached".
        const skills = allSkills.filter((skill) => {
          const state = stateBySkill.get(skill.id) ?? CurriculumState.LOCKED;
          return inGrade(skill) && state !== CurriculumState.LOCKED;
        });
        // A subject with nothing reached in this grade is not a patch worth drawing.
        if (skills.length === 0) continue;
        subjectInputs.push({
          id: subj.id,
          name: subj.name,
          skills: skills.map((skill) => ({
            skillId: skill.id,
            title: skill.name,
            difficulty: skill.difficulty,
            state: stateBySkill.get(skill.id) ?? CurriculumState.LOCKED,
            health: healthBySkill.get(skill.id) ?? null,
          })),
        });
      }

      const garden = buildGarden({ subjects: subjectInputs, now });
      return res.status(200).json({
        success: true,
        data: {
          subjects: garden.subjects.map((gs) => ({ ...visualById.get(gs.id), ...gs })),
          totals: garden.totals,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * "My Story" — the child's progress retold as a cheerful comic (spec: personalized
   * progress story). A projection, not stored: the facts are assembled here from the
   * child's own history and handed to the pure `buildProgressStory`, which owns the
   * arc. Grade-scoped exactly like the garden, so the story only tells this grade.
   */
  async getStory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const child = await prisma.child.findUnique({ where: { id: childId } });
      const ageGroup = child?.ageGroup ?? undefined;
      const gradeKey = curriculumService.resolveChildGrade({ ageGroup });
      const gradeNumber = curriculumService.resolveChildGradeNumber({ ageGroup });
      const gradeTitle = curriculumService.getCurriculumByGrade(gradeKey)?.grade?.name ?? gradeKey;

      // Grade-scoped skills (by the grade's authoritative skill-code set, since
      // originalGrade is null in the seeded data), keyed to their subject.
      const gradeSkillCodes = curriculumService.getGradeSkillCodes(gradeKey);
      const skills = await prisma.skill.findMany({
        where:
          gradeSkillCodes.size > 0
            ? { skillCode: { in: Array.from(gradeSkillCodes) } }
            : { OR: [{ originalGrade: gradeNumber }, { originalGrade: null }] },
        select: { id: true, subject: { select: { id: true, name: true } } },
      });
      const subjectBySkill = new Map(skills.map((s) => [s.id, s.subject]));
      const skillIds = skills.map((s) => s.id);

      const [histories, attempts, stumbles] = await Promise.all([
        skillIds.length
          ? prisma.skillHistory.findMany({
              where: { childId, skillId: { in: skillIds } },
              orderBy: { timestamp: 'asc' },
            })
          : Promise.resolve([]),
        prisma.assessmentAttempt.findMany({
          where: { childId, completedAt: { not: null } },
          select: { percentage: true, completedAt: true, assessment: { select: { title: true } } },
          orderBy: { completedAt: 'asc' },
        }),
        prisma.regressionLog.count({ where: { childId } }),
      ]);

      // Earliest vs. latest recorded mastery per skill (histories are ascending).
      const firstBySkill = new Map<string, number>();
      const lastBySkill = new Map<string, number>();
      let startedAt: Date | null = null;
      for (const h of histories) {
        if (!firstBySkill.has(h.skillId)) firstBySkill.set(h.skillId, h.masteryScore);
        lastBySkill.set(h.skillId, h.masteryScore);
        if (!startedAt) startedAt = h.timestamp;
      }

      // Aggregate before/after per subject and overall.
      interface Agg { name: string; beforeSum: number; afterSum: number; count: number }
      const bySubject = new Map<string, Agg>();
      let overallBefore = 0;
      let overallAfter = 0;
      let overallCount = 0;
      for (const skillId of firstBySkill.keys()) {
        const subject = subjectBySkill.get(skillId);
        if (!subject) continue;
        const before = firstBySkill.get(skillId)!;
        const after = lastBySkill.get(skillId)!;
        overallBefore += before;
        overallAfter += after;
        overallCount += 1;
        const agg = bySubject.get(subject.id) ?? { name: subject.name, beforeSum: 0, afterSum: 0, count: 0 };
        agg.beforeSum += before;
        agg.afterSum += after;
        agg.count += 1;
        bySubject.set(subject.id, agg);
      }

      const subjects: StorySubjectInput[] = Array.from(bySubject.values())
        .map((a) => ({ name: a.name, before: a.beforeSum / a.count, after: a.afterSum / a.count }))
        .sort((x, y) => x.name.localeCompare(y.name));

      const bosses: StoryBossInput[] = attempts.map((a) => ({
        title: a.assessment?.title ?? 'A Big Test',
        percentage: a.percentage ?? null,
        defeated: (a.percentage ?? 0) >= 60,
        when: a.completedAt ?? null,
      }));

      // Earliest attempt can predate the first history row.
      if (bosses.length && bosses[0].when) {
        if (!startedAt || bosses[0].when < startedAt) startedAt = bosses[0].when;
      }

      const story = buildProgressStory({
        childName: child?.name ?? 'Little Explorer',
        gradeTitle,
        startedAt,
        now: new Date(),
        overallBefore: overallCount ? overallBefore / overallCount : 0,
        overallAfter: overallCount ? overallAfter / overallCount : 0,
        subjects,
        bosses,
        stumbles,
      });

      return res.status(200).json({ success: true, data: story });
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
