import { prisma } from '../../config/database.js';
import { CurriculumState, MasteryState } from '../../shared/enums.js';
import { subjectRepository } from './repositories/subject.repository.js';
import { childSkillCurriculumRepository } from './repositories/child-skill-curriculum.repository.js';
import { skillRepository } from './repositories/skill.repository.js';
import { skillDependencyRepository } from './repositories/skill-dependency.repository.js';
import { skillHealthRepository } from '../mastery/repositories/skill-health.repository.js';

export interface CurriculumRecommendationDto {
  subjectId: string;
  subjectName: string;
  nextSkillId: string;
  nextSkillName: string;
  priority: number;
  reason: string;
}

export class CurriculumEngineService {
  /**
   * Root skills are skills with no prerequisites or flagged as isRootSkill.
   */
  async getRootSkills(subjectId?: string) {
    const where: any = { isRootSkill: true };
    if (subjectId) {
      where.subjectId = subjectId;
    }
    return skillRepository.findAll(where);
  }

  /**
   * Fetch prerequisite relationships where this skill is the child.
   */
  async getPrerequisites(skillId: string) {
    return skillDependencyRepository.findByChildSkill(skillId);
  }

  /**
   * Calculates the unlock ratio of a skill based on parent mastery.
   * unlockRatio = sum(parent_mastery_scores * weights) / sum(weights)
   */
  async calculateUnlockRatio(childId: string, skillId: string): Promise<number> {
    const prerequisites = await this.getPrerequisites(skillId);
    if (prerequisites.length === 0) {
      return 100.0;
    }

    let weightedScoreSum = 0;
    let weightSum = 0;

    for (const prereq of prerequisites) {
      const parentHealth = await skillHealthRepository.findByChildAndSkill(childId, prereq.parentSkillId);
      const parentScore = parentHealth?.masteryScore ?? 0.0;

      weightedScoreSum += parentScore * prereq.weight;
      weightSum += prereq.weight;
    }

    if (weightSum === 0) {
      return 100.0;
    }

    return Math.max(0, Math.min(100, weightedScoreSum / weightSum));
  }

  /**
   * Fetch all skills that are root skills or have unlockRatio >= 70, and are not completed.
   */
  async getAvailableSkills(childId: string, subjectId?: string) {
    const where: any = {};
    if (subjectId) {
      where.subjectId = subjectId;
    }

    const allSkills = await skillRepository.findAll(where);

    const availableSkills: any[] = [];

    for (const skill of allSkills) {
      // 1. Check if completed in curriculum or health
      const curriculumRecord = await childSkillCurriculumRepository.findByChildAndSkill(childId, skill.id);
      if (curriculumRecord?.state === CurriculumState.COMPLETED) {
        continue;
      }

      const health = await skillHealthRepository.findByChildAndSkill(childId, skill.id);
      if (health && health.masteryScore >= 85.0) {
        continue;
      }

      // 2. Evaluate root skills and unlock ratio
      if (skill.isRootSkill) {
        availableSkills.push({ skill, unlockRatio: 100.0 });
        continue;
      }

      const unlockRatio = await this.calculateUnlockRatio(childId, skill.id);
      if (unlockRatio >= 70.0) {
        availableSkills.push({ skill, unlockRatio });
      }
    }

    return availableSkills;
  }

  /**
   * Set a child skill curriculum state to ACTIVE.
   */
  async activateSkill(childId: string, skillId: string) {
    const skill = await skillRepository.findById(skillId);
    if (!skill) throw new Error('Skill not found');

    const unlockRatio = await this.calculateUnlockRatio(childId, skillId);

    return childSkillCurriculumRepository.upsert(childId, skillId, {
      state: CurriculumState.ACTIVE,
      unlockRatio,
      priority: 0.0,
      activatedAt: new Date(),
      completedAt: null,
    });
  }

  /**
   * Set a child skill curriculum state to COMPLETED.
   */
  async completeSkill(childId: string, skillId: string) {
    const skill = await skillRepository.findById(skillId);
    if (!skill) throw new Error('Skill not found');

    const unlockRatio = await this.calculateUnlockRatio(childId, skillId);

    return childSkillCurriculumRepository.upsert(childId, skillId, {
      state: CurriculumState.COMPLETED,
      unlockRatio,
      priority: 0.0,
      completedAt: new Date(),
    });
  }

  /**
   * Prioritize subjects based on child's age profile.
   */
  async prioritizeSubjects(childId: string): Promise<Array<{ subject: any; priority: number }>> {
    const child = await prisma.child.findUnique({ where: { id: childId } });
    const age = child?.age ?? 5;
    const subjects = await subjectRepository.findAll();

    return subjects
      .map((subj) => {
        let priority = 50.0;
        if (subj.name === 'Writing') {
          priority = age < 4 ? 90.0 : age < 6 ? 70.0 : 60.0;
        } else if (subj.name === 'Cognitive') {
          priority = age < 4 ? 80.0 : age < 6 ? 60.0 : 50.0;
        } else if (subj.name === 'Language') {
          priority = age < 4 ? 70.0 : age < 6 ? 90.0 : 80.0;
        } else if (subj.name === 'Math') {
          priority = age < 4 ? 60.0 : age < 6 ? 80.0 : 90.0;
        }
        return { subject: subj, priority };
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Determines next optimal skill for a single subject.
   */
  async determineNextSkill(childId: string, subjectId: string): Promise<CurriculumRecommendationDto | null> {
    const available = await this.getAvailableSkills(childId, subjectId);
    if (available.length === 0) {
      return null;
    }

    const subjectPriorities = await this.prioritizeSubjects(childId);
    const subjectPriorityItem = subjectPriorities.find((sp) => sp.subject.id === subjectId);
    const subjectPriority = subjectPriorityItem?.priority ?? 50.0;

    const candidates: Array<CurriculumRecommendationDto> = [];

    const now = new Date();

    for (const item of available) {
      const { skill, unlockRatio } = item;

      // 1. Fetch current mastery health
      const health = await skillHealthRepository.findByChildAndSkill(childId, skill.id);
      const masteryScore = health?.masteryScore ?? 0.0;
      const masteryGap = 100.0 - masteryScore;

      // 2. Compute recency factor (in days)
      let recencyFactor = 100.0; // Default to max priority for fresh unpracticed skills
      if (health?.lastPracticed) {
        const lastPracticed = new Date(health.lastPracticed);
        const timeDiff = now.getTime() - lastPracticed.getTime();
        const daysElapsed = timeDiff / (1000 * 60 * 60 * 24);
        recencyFactor = Math.min(100.0, daysElapsed * 10.0);
      }

      // 3. Compute overall priority
      const priority = 0.5 * masteryGap + 0.3 * subjectPriority + 0.2 * recencyFactor;

      // 4. Draft readable reasoning
      let reason = `Recommended to practice ${skill.name}. `;
      if (masteryScore === 0.0) {
        reason += `This is a new available skill in ${skill.subject.name}.`;
      } else {
        reason += `Prerequisites satisfied (Ratio: ${unlockRatio.toFixed(0)}%). Current mastery gap: ${masteryGap.toFixed(0)}%.`;
      }

      candidates.push({
        subjectId,
        subjectName: skill.subject.name,
        nextSkillId: skill.id,
        nextSkillName: skill.name,
        priority: Math.round(priority),
        reason,
      });
    }

    // Sort by priority descending
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0];
  }

  /**
   * Generates dynamic in-memory recommendations for all subjects.
   */
  async generateRecommendations(childId: string): Promise<CurriculumRecommendationDto[]> {
    const subjects = await subjectRepository.findAll();
    const recommendations: CurriculumRecommendationDto[] = [];

    for (const subj of subjects) {
      const rec = await this.determineNextSkill(childId, subj.id);
      if (rec) {
        recommendations.push(rec);
      }
    }

    // Sort recommendations by priority descending
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Syncs and updates the ChildSkillCurriculum database states for this child.
   */
  async generateCurriculum(childId: string) {
    const allSkills = await skillRepository.findAll({});
    const updatedRecords: any[] = [];

    for (const skill of allSkills) {
      const health = await skillHealthRepository.findByChildAndSkill(childId, skill.id);
      const isMastered = health && health.masteryScore >= 85.0;

      // Calculate state
      let state: CurriculumState = CurriculumState.LOCKED;
      const unlockRatio = await this.calculateUnlockRatio(childId, skill.id);

      if (isMastered) {
        state = CurriculumState.COMPLETED;
      } else {
        const existing = await childSkillCurriculumRepository.findByChildAndSkill(childId, skill.id);
        if (existing?.state === CurriculumState.ACTIVE) {
          state = CurriculumState.ACTIVE;
        } else if (skill.isRootSkill || unlockRatio >= 70.0) {
          state = CurriculumState.AVAILABLE;
        }
      }

      // Compute simple priority for tracking
      const subjectPriorities = await this.prioritizeSubjects(childId);
      const subjectPriority = subjectPriorities.find((sp) => sp.subject.id === skill.subjectId)?.priority ?? 50.0;
      const masteryGap = 100.0 - (health?.masteryScore ?? 0.0);
      const priority = 0.5 * masteryGap + 0.3 * subjectPriority;

      const record = await childSkillCurriculumRepository.upsert(childId, skill.id, {
        state,
        unlockRatio,
        priority,
        completedAt: state === CurriculumState.COMPLETED ? (health?.lastPracticed ?? new Date()) : null,
      });

      updatedRecords.push(record);
    }

    return updatedRecords;
  }

  /**
   * Returns top dynamic recommendations.
   */
  async recommendNextSkills(childId: string, limit = 3): Promise<CurriculumRecommendationDto[]> {
    const recs = await this.generateRecommendations(childId);
    return recs.slice(0, limit);
  }
}

export const curriculumEngineService = new CurriculumEngineService();
