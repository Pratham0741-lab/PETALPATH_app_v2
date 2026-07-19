import { prisma } from '../../config/database.js';
import { CurriculumState, MasteryState } from '../../shared/enums.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { subjectRepository } from './repositories/subject.repository.js';
import { childSkillCurriculumRepository } from './repositories/child-skill-curriculum.repository.js';
import { skillRepository } from './repositories/skill.repository.js';
import { skillDependencyRepository } from './repositories/skill-dependency.repository.js';
import { skillHealthRepository } from '../mastery/repositories/skill-health.repository.js';
import { NotFoundError } from '../../utils/errors.js';
import { CurriculumNode } from './curriculum.types.js';
import { ACTIVITY_STARS_CONFIG, GRADE_AGE_GROUP_MAP } from './curriculum.config.js';

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
      if (health && health.masteryScore >= engineConfig.curriculum.skillCompletionMasteryThreshold) {
        continue;
      }

      // 2. Evaluate root skills and unlock ratio
      if (skill.isRootSkill) {
        availableSkills.push({ skill, unlockRatio: 100.0 });
        continue;
      }

      const unlockRatio = await this.calculateUnlockRatio(childId, skill.id);
      if (unlockRatio >= engineConfig.curriculum.unlockRatioThreshold) {
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
    if (!skill) throw new NotFoundError('Skill not found');

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
    if (!skill) throw new NotFoundError('Skill not found');

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
        let priority: number = engineConfig.curriculum.defaultSubjectPriority;
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
    const subjectPriority = subjectPriorityItem?.priority ?? engineConfig.curriculum.defaultSubjectPriority;

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
      const pw = engineConfig.curriculum.priorityWeights;
      const priority = pw.masteryGap * masteryGap + pw.subjectPriority * subjectPriority + pw.recency * recencyFactor;

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
      const isMastered = health && health.masteryScore >= engineConfig.curriculum.skillCompletionMasteryThreshold;

      // Calculate state
      let state: CurriculumState = CurriculumState.LOCKED;
      const unlockRatio = await this.calculateUnlockRatio(childId, skill.id);

      if (isMastered) {
        state = CurriculumState.COMPLETED;
      } else {
        const existing = await childSkillCurriculumRepository.findByChildAndSkill(childId, skill.id);
        if (existing?.state === CurriculumState.ACTIVE) {
          state = CurriculumState.ACTIVE;
        } else if (skill.isRootSkill || unlockRatio >= engineConfig.curriculum.unlockRatioThreshold) {
          state = CurriculumState.AVAILABLE;
        }
      }

      // Compute simple priority for tracking
      const subjectPriorities = await this.prioritizeSubjects(childId);
      const subjectPriority = subjectPriorities.find((sp) => sp.subject.id === skill.subjectId)?.priority ?? engineConfig.curriculum.defaultSubjectPriority;
      const masteryGap = 100.0 - (health?.masteryScore ?? 0.0);
      const gw = engineConfig.curriculum.generateCurriculumWeights;
      const priority = gw.masteryGap * masteryGap + gw.subjectPriority * subjectPriority;

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

  /**
   * Helper to check if a specific prerequisite lesson has status 'COMPLETED'
   */
  public isPrerequisiteCompleted(
    prereqId: string,
    progressList: { lessonId: string; status: string }[]
  ): boolean {
    const progress = progressList.find((p) => p.lessonId === prereqId);
    return progress?.status === 'COMPLETED';
  }

  /**
   * Helper to check if a specific lesson ID's mastery score meets the threshold required by the node.
   */
  public isMasteryRequirementSatisfied(
    lessonId: string,
    requiredScore: number,
    knowledgeState?: { mastery: number }
  ): boolean {
    if (!knowledgeState) {
      return requiredScore <= 0;
    }
    return knowledgeState.mastery >= requiredScore;
  }

  /**
   * Decides if a lesson is unlocked for a child based on prerequisites, completion state, and mastery.
   */
  public isLessonUnlocked(
    lessonId: string,
    gradeLessons: readonly CurriculumNode[],
    progressList: { lessonId: string; status: string }[],
    knowledgeStates: { topicId: string; mastery: number }[]
  ): boolean {
    const index = gradeLessons.findIndex((n) => n.id === lessonId);
    if (index === -1) {
      return false;
    }

    const node = gradeLessons[index];

    // First node in the grade is unlocked by default
    if (index === 0) {
      return true;
    }

    // Evaluate prerequisites if defined and non-empty
    if (node.prerequisites && node.prerequisites.length > 0) {
      const progressMap = new Map(progressList.map((p) => [p.lessonId, p]));
      const knowledgeMap = new Map(knowledgeStates.map((k) => [k.topicId, k]));

      for (const prereqId of node.prerequisites) {
        const prereqProgress = progressMap.get(prereqId);
        const prereqCompleted = prereqProgress?.status === 'COMPLETED';
        if (!prereqCompleted) {
          return false;
        }

        if (node.mastery) {
          const prereqKnowledge = knowledgeMap.get(prereqId);
          const prereqMastery = prereqKnowledge?.mastery ?? 0.0;
          if (prereqMastery < node.mastery.required_score) {
            return false;
          }
        }
      }
      return true;
    }

    // Fallback: previous node in grade curriculum completed
    const prevNode = gradeLessons[index - 1];
    return this.isPrerequisiteCompleted(prevNode.id, progressList);
  }

  /**
   * Scans lessons in curriculum order to find the first unlocked, uncompleted lesson.
   */
  public determineNextAvailableLesson(
    gradeLessons: readonly CurriculumNode[],
    progressList: { lessonId: string; status: string }[],
    knowledgeStates: { topicId: string; mastery: number }[]
  ): string | null {
    const completedSet = new Set(
      progressList.filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId)
    );

    for (const node of gradeLessons) {
      if (!completedSet.has(node.id)) {
        if (this.isLessonUnlocked(node.id, gradeLessons, progressList, knowledgeStates)) {
          return node.id;
        }
      }
    }

    return null;
  }

  /**
   * Checks if all lessons in a theme/module are completed.
   */
  public isThemeCompleted(
    themeId: string,
    themeNodes: readonly CurriculumNode[],
    progressList: { lessonId: string; status: string }[]
  ): boolean {
    if (themeNodes.length === 0) {
      return false;
    }

    const completedSet = new Set(
      progressList.filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId)
    );

    return themeNodes.every((node) => completedSet.has(node.id));
  }

  /**
   * Evaluates grade completion.
   */
  public isGradeCompleted(
    gradeLessons: readonly CurriculumNode[],
    progressList: { lessonId: string; status: string }[],
    completedLessonId?: string
  ): boolean {
    if (gradeLessons.length === 0) {
      return false;
    }

    const lastNode = gradeLessons[gradeLessons.length - 1];

    // 1. Check if the completed lesson is the last node
    const isLastNode = completedLessonId === lastNode?.id;

    // 2. Check if the completed lesson has a graduation title
    const completedNode = completedLessonId
      ? gradeLessons.find((n) => n.id === completedLessonId)
      : undefined;
    const isGraduationNode = completedNode
      ? completedNode.title?.toLowerCase().includes('unlock') ||
        completedNode.title?.toLowerCase().includes('graduation')
      : false;

    if (isLastNode || isGraduationNode) {
      return true;
    }

    // 3. Check if all nodes are completed
    const completedSet = new Set(
      progressList.filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId)
    );

    return gradeLessons.every((node) => completedSet.has(node.id));
  }

  /**
   * Evaluates all requirements for lesson completion.
   */
  public canCompleteLesson(
    node: CurriculumNode,
    progress: {
      videoCompleted: boolean;
      listenCompleted: boolean;
      speakCompleted: boolean;
      writeCompleted: boolean;
    },
    knowledgeState?: { mastery: number }
  ): boolean {
    // 1. Verify all activities defined in node are completed
    const requiredTypes = node.activities.map((a) => a.type);
    const hasVideo = requiredTypes.includes('video');
    const hasListen = requiredTypes.includes('listen');
    const hasSpeak = requiredTypes.includes('speak');
    const hasWrite = requiredTypes.includes('write');

    if (hasVideo && !progress.videoCompleted) return false;
    if (hasListen && !progress.listenCompleted) return false;
    if (hasSpeak && !progress.speakCompleted) return false;
    if (hasWrite && !progress.writeCompleted) return false;

    // 2. Verify mastery requirement is satisfied
    if (node.mastery) {
      if (!knowledgeState) {
        return false;
      }
      if (knowledgeState.mastery < node.mastery.required_score) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns default stars configured for an activity type
   */
  public getActivityDefaultStars(activityType: string): number {
    return ACTIVITY_STARS_CONFIG[activityType] ?? 0;
  }

  /**
   * Resolves the label for the next grade.
   */
  public getNextGradeLabel(currentGradeId: string): string | null {
    const nextGradeMap: Record<string, string | null> = {
      prenursery: 'nursery',
      nursery: 'lkg',
      lkg: 'ukg',
      ukg: null,
    };

    const nextGrade = nextGradeMap[currentGradeId];
    if (!nextGrade) {
      return null;
    }

    return GRADE_AGE_GROUP_MAP[nextGrade] || null;
  }
}

export const curriculumEngineService = new CurriculumEngineService();
