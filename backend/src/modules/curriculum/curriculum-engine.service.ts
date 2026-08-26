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
import {
  evaluateUnlock,
  type PrerequisiteEvidence,
  type UnlockDecision,
  type UnlockPolicyOptions,
} from './unlock-policy.js';
import { ACTIVITY_STARS_CONFIG, GRADE_AGE_GROUP_MAP } from './curriculum.config.js';
import { normalizeActivityType } from '../../shared/utils/activity-type-normalizer.js';

export interface CurriculumRecommendationDto {
  subjectId: string;
  subjectName: string;
  nextSkillId: string;
  nextSkillName: string;
  priority: number;
  reason: string;
}

/**
 * One child's unlock evidence, read in a single pass.
 *
 * `live` is the decaying `SkillHealth` score, `highWater` is the best mastery
 * ever recorded in `KnowledgeState`, and `curriculumState` is the lazily written
 * `ChildSkillCurriculum` row. Which of the two scores a gate reads is a config
 * decision — see `masteryFor`.
 */
interface UnlockContext {
  readonly live: Map<string, { masteryScore: number; lastPracticed: Date }>;
  readonly highWater: Map<string, number>;
  readonly curriculumState: Map<string, CurriculumState>;
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
   * Everything the unlock policy needs to know about one child, in three
   * queries.
   *
   * Read once per request rather than once per skill: `getAvailableSkills` and
   * `generateCurriculum` both walk the entire skill table, and the previous
   * shape issued a query per skill *and a further query per prerequisite of
   * that skill* — on the order of 3,600 round trips for a 1,200-skill
   * curriculum.
   */
  private async loadUnlockContext(childId: string): Promise<UnlockContext> {
    const [healthRows, knowledgeRows, curriculumRows] = await Promise.all([
      prisma.skillHealth.findMany({
        where: { childId },
        select: { skillId: true, masteryScore: true, lastPracticed: true },
      }),
      prisma.knowledgeState.findMany({
        where: { childId },
        select: { topicId: true, mastery: true },
      }),
      prisma.childSkillCurriculum.findMany({
        where: { childId },
        select: { skillId: true, state: true },
      }),
    ]);

    return {
      live: new Map(healthRows.map((r) => [r.skillId, r])),
      highWater: new Map(knowledgeRows.map((r) => [r.topicId, r.mastery])),
      curriculumState: new Map(curriculumRows.map((r) => [r.skillId, r.state])),
    };
  }

  /**
   * The mastery figure a gate should read for a skill.
   *
   * `useHighWaterMark` prefers `KnowledgeState.mastery` — the best the child has
   * ever demonstrated — over `SkillHealth.masteryScore`, which decays with time.
   * A lesson must not re-lock overnight because retention faded; decay belongs
   * to the review queue, not to the gate. The two stores are written by
   * different code paths and either may be absent, so each falls back to the
   * other.
   */
  private masteryFor(ctx: UnlockContext, skillId: string): number {
    const highWater = ctx.highWater.get(skillId);
    const live = ctx.live.get(skillId)?.masteryScore;
    return engineConfig.unified.unlock.useHighWaterMark
      ? (highWater ?? live ?? 0)
      : (live ?? highWater ?? 0);
  }

  /**
   * Applies the shared unlock policy to one skill's prerequisites.
   *
   * Completion is recorded in the evidence but deliberately not required here.
   * `ChildSkillCurriculum` is written lazily — by `generateCurriculum`, and by
   * the mastery engine when a skill is first mastered — so a child with no rows
   * yet would have every prerequisite counted as unfinished and the whole graph
   * would close. The lesson gate reads `LessonProgress`, which is always
   * written, and does require completion.
   */
  private evaluateSkillUnlockWith(
    ctx: UnlockContext,
    prerequisites: readonly { parentSkillId: string; weight: number }[]
  ): UnlockDecision {
    const evidence: PrerequisiteEvidence[] = prerequisites.map((prereq) => ({
      skillId: prereq.parentSkillId,
      completed: ctx.curriculumState.get(prereq.parentSkillId) === CurriculumState.COMPLETED,
      mastery: this.masteryFor(ctx, prereq.parentSkillId),
      weight: prereq.weight,
    }));

    return evaluateUnlock(evidence, { requirePrerequisiteCompletion: false });
  }

  /**
   * Whether a skill's prerequisites are satisfied, and why.
   */
  async evaluateSkillUnlock(childId: string, skillId: string): Promise<UnlockDecision> {
    const [prerequisites, ctx] = await Promise.all([
      this.getPrerequisites(skillId),
      this.loadUnlockContext(childId),
    ]);
    return this.evaluateSkillUnlockWith(ctx, prerequisites);
  }

  /**
   * The same decision for many skills at once, sharing one read of the child's
   * evidence.
   */
  private async evaluateSkillUnlocks(
    childId: string,
    skillIds: readonly string[]
  ): Promise<{ ctx: UnlockContext; decisions: Map<string, UnlockDecision> }> {
    const [dependencies, ctx] = await Promise.all([
      skillIds.length > 0
        ? prisma.skillDependency.findMany({
            where: { childSkillId: { in: [...skillIds] } },
            select: { childSkillId: true, parentSkillId: true, weight: true },
          })
        : [],
      this.loadUnlockContext(childId),
    ]);

    const byChildSkill = new Map<string, { parentSkillId: string; weight: number }[]>();
    for (const dep of dependencies) {
      const list = byChildSkill.get(dep.childSkillId) ?? [];
      list.push({ parentSkillId: dep.parentSkillId, weight: dep.weight });
      byChildSkill.set(dep.childSkillId, list);
    }

    const decisions = new Map<string, UnlockDecision>();
    for (const skillId of skillIds) {
      decisions.set(skillId, this.evaluateSkillUnlockWith(ctx, byChildSkill.get(skillId) ?? []));
    }

    return { ctx, decisions };
  }

  /**
   * The weighted prerequisite average for a skill, 0-100.
   *
   * Retained for callers that only want the number. The arithmetic itself now
   * lives in `unlock-policy.ts`, so this and the lesson gate can no longer
   * disagree about the same prerequisites.
   */
  async calculateUnlockRatio(childId: string, skillId: string): Promise<number> {
    const decision = await this.evaluateSkillUnlock(childId, skillId);
    return decision.weightedScore;
  }

  /**
   * Fetch all skills that are root skills or whose prerequisites are satisfied,
   * and that are not already finished.
   */
  async getAvailableSkills(childId: string, subjectId?: string) {
    const where: any = {};
    if (subjectId) {
      where.subjectId = subjectId;
    }

    const allSkills = await skillRepository.findAll(where);
    const { ctx, decisions } = await this.evaluateSkillUnlocks(
      childId,
      allSkills.map((skill) => skill.id)
    );

    const availableSkills: any[] = [];

    for (const skill of allSkills) {
      // 1. Already finished, by either record
      if (ctx.curriculumState.get(skill.id) === CurriculumState.COMPLETED) {
        continue;
      }

      const health = ctx.live.get(skill.id);
      if (health && health.masteryScore >= engineConfig.curriculum.skillCompletionMasteryThreshold) {
        continue;
      }

      // 2. Root skills have nothing to satisfy; everything else asks the policy,
      //    so the per-prerequisite floor applies here too and not just to
      //    lessons.
      if (skill.isRootSkill) {
        availableSkills.push({ skill, unlockRatio: 100.0 });
        continue;
      }

      const decision = decisions.get(skill.id);
      if (decision?.unlocked) {
        availableSkills.push({ skill, unlockRatio: decision.weightedScore });
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
    const { ctx, decisions } = await this.evaluateSkillUnlocks(
      childId,
      allSkills.map((skill) => skill.id)
    );
    /*
     * Subject priorities depend on the child, not on the skill, so they are
     * computed once. They used to be recomputed inside the loop — two extra
     * queries for every skill in the curriculum.
     */
    const subjectPriorities = await this.prioritizeSubjects(childId);
    const priorityBySubject = new Map(subjectPriorities.map((sp) => [sp.subject.id, sp.priority]));

    const updatedRecords: any[] = [];

    for (const skill of allSkills) {
      const health = ctx.live.get(skill.id);
      const isMastered = health !== undefined
        && health.masteryScore >= engineConfig.curriculum.skillCompletionMasteryThreshold;
      const decision = decisions.get(skill.id);
      const unlockRatio = decision?.weightedScore ?? 100.0;

      // Calculate state
      let state: CurriculumState = CurriculumState.LOCKED;

      if (isMastered) {
        state = CurriculumState.COMPLETED;
      } else if (ctx.curriculumState.get(skill.id) === CurriculumState.ACTIVE) {
        state = CurriculumState.ACTIVE;
      } else if (skill.isRootSkill || decision?.unlocked) {
        state = CurriculumState.AVAILABLE;
      }

      // Compute simple priority for tracking
      const subjectPriority = priorityBySubject.get(skill.subjectId)
        ?? engineConfig.curriculum.defaultSubjectPriority;
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
   * The thresholds a single node is judged against.
   *
   * A node may declare its own `mastery.required_score`, and it is honoured only
   * when it is *easier* than the configured threshold. Every node in the shipped
   * curriculum asks for 80 on every prerequisite, which is what made most of the
   * curriculum unreachable; taking the minimum keeps a node's own number
   * meaningful in the one direction that cannot re-break reachability. The floor
   * never exceeds the threshold, so a node can never be harder to open than its
   * own average demands.
   */
  private unlockOptionsFor(node: CurriculumNode): UnlockPolicyOptions {
    const cfg = engineConfig.unified.unlock;
    const declared = node.mastery?.required_score;
    const weightedThreshold = declared === undefined
      ? cfg.weightedThreshold
      : Math.min(declared, cfg.weightedThreshold);

    return {
      weightedThreshold,
      perPrerequisiteFloor: Math.min(cfg.perPrerequisiteFloor, weightedThreshold),
    };
  }

  /**
   * Decides whether a lesson is open, and returns the reason with it.
   *
   * The reason is the point: "Access denied: lesson is currently locked" told a
   * parent nothing, and the padlock told a child nothing. Callers that only need
   * the boolean use `isLessonUnlocked`.
   */
  public evaluateLessonUnlock(
    lessonId: string,
    gradeLessons: readonly CurriculumNode[],
    progressList: { lessonId: string; status: string }[],
    knowledgeStates: { topicId: string; mastery: number }[]
  ): UnlockDecision {
    const index = gradeLessons.findIndex((n) => n.id === lessonId);
    if (index === -1) {
      return { unlocked: false, reason: 'LESSON_NOT_IN_GRADE', weightedScore: 0, blockingSkillIds: [] };
    }

    const node = gradeLessons[index];

    // First node in the grade is unlocked by default
    if (index === 0) {
      return { unlocked: true, reason: 'FIRST_LESSON', weightedScore: 100, blockingSkillIds: [] };
    }

    const progressMap = new Map(progressList.map((p) => [p.lessonId, p]));
    const knowledgeMap = new Map(knowledgeStates.map((k) => [k.topicId, k]));

    /*
     * `KnowledgeState.mastery` is the high-water mark, so a lesson the child has
     * already opened cannot close again as retention decays — that is what the
     * review queue is for.
     */
    const evidenceFor = (prereqId: string): PrerequisiteEvidence => ({
      skillId: prereqId,
      completed: progressMap.get(prereqId)?.status === 'COMPLETED',
      mastery: knowledgeMap.get(prereqId)?.mastery ?? 0,
    });

    const declared = node.prerequisites ?? [];
    if (declared.length > 0) {
      return evaluateUnlock(declared.map(evidenceFor), this.unlockOptionsFor(node));
    }

    /*
     * No declared prerequisites: the curriculum's own ordering is the
     * prerequisite. This branch used to check completion alone and ignore
     * mastery entirely, so the gate was strict or lax for the same child
     * depending on whether the JSON happened to list a prerequisite. It now runs
     * the same policy against the previous node.
     */
    const previousNode = gradeLessons[index - 1];
    const decision = evaluateUnlock([evidenceFor(previousNode.id)], this.unlockOptionsFor(node));
    return decision.unlocked
      ? { ...decision, reason: 'SEQUENTIAL_PREVIOUS_COMPLETE' }
      : decision;
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
    return this.evaluateLessonUnlock(lessonId, gradeLessons, progressList, knowledgeStates).unlocked;
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
   * Evaluates all requirements for lesson completion: coverage only.
   *
   * The mastery clause that used to live here was a deadlock. A lesson's mastery
   * is scored *from* the completion event, so there was no mastery until the
   * lesson completed and no completion until there was mastery; with a fresh
   * `KnowledgeState` absent entirely, `canCompleteLesson` returned false for
   * every node that declares a required score — which is all of them.
   *
   * Completion now means "the child did the work", and how well they did it is
   * the mastery score's business: a thin pass completes the lesson and scores
   * low, which is what keeps it in the review queue instead of blocking the
   * child in place. The gate on *opening* the next lesson is
   * `evaluateLessonUnlock`.
   */
  public canCompleteLesson(
    node: CurriculumNode,
    progress: {
      videoCompleted: boolean;
      listenCompleted: boolean;
      speakCompleted: boolean;
      writeCompleted: boolean;
    }
  ): boolean {
    // Verify all activities defined in node are completed
    // Normalize granular types (trace→write, tap→listen, etc.) before checking
    const normalizedTypes = node.activities.map((a) => normalizeActivityType(a.type));
    const hasVideo = normalizedTypes.includes('video');
    const hasListen = normalizedTypes.includes('listen');
    const hasSpeak = normalizedTypes.includes('speak');
    const hasWrite = normalizedTypes.includes('write');

    if (hasVideo && !progress.videoCompleted) return false;
    if (hasListen && !progress.listenCompleted) return false;
    if (hasSpeak && !progress.speakCompleted) return false;
    if (hasWrite && !progress.writeCompleted) return false;

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
