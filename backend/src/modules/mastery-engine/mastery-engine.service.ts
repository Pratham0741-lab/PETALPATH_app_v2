import { prisma } from '../../config/database.js';
import { masteryEngineService as existingMasteryService } from '../mastery/mastery.service.js';
import * as scoring from '../mastery/mastery-scoring.js';
import { skillRoadmapService } from '../skill-roadmap/skill-roadmap.service.js';
import { reinforcementEngineService } from '../reinforcement/reinforcement-engine.service.js';
import { masteryEngineRepository } from './mastery-engine.repository.js';
import { masteryConstants } from '../../config/mastery.constants.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { CurriculumState, MasteryState } from '../../shared/enums.js';
import { logger } from '../../utils/logger.js';
import type { EvaluateMasteryInput, MasteryEvaluationResult, ProcessRevisionInput, RevisionQueueItem, SkillHistoryEntry } from './mastery-engine.types.js';
import type { Prisma, SkillHealth } from '@prisma/client';

export class MasteryEngineService {
  /**
   * Scores one practice event and writes every consequence of it.
   *
   * @param externalTx When the caller already holds a transaction, pass it so
   *   the lesson's own writes and the engine's writes commit or fail together.
   *   Without this, a lesson could be marked complete while the mastery write
   *   that the unlock gate reads silently failed — the two stores drifting apart
   *   is the defect class this parameter exists to prevent. The caller is then
   *   responsible for the post-commit roadmap refresh signalled by
   *   `pendingRoadmapRefresh`.
   */
  async evaluateMastery(
    input: EvaluateMasteryInput,
    externalTx?: Prisma.TransactionClient,
  ): Promise<MasteryEvaluationResult> {
    const { childId, skillId, attempts, retries } = input;
    const currentDate = input.timestamp ? new Date(input.timestamp) : new Date();

    const [previousHealth, recentHistory, allDeps] = await Promise.all([
      masteryEngineRepository.findSkillHealth(childId, skillId),
      masteryEngineRepository.findSkillHistory(childId, skillId),
      masteryEngineRepository.findAllDependencies(),
    ]);

    const prereqMap = new Map<string, string[]>();
    const dependentMap = new Map<string, string[]>();
    for (const dep of allDeps) {
      const prereqs = prereqMap.get(dep.childSkillId) ?? [];
      prereqs.push(dep.parentSkillId);
      prereqMap.set(dep.childSkillId, prereqs);
      const dependents = dependentMap.get(dep.parentSkillId) ?? [];
      dependents.push(dep.childSkillId);
      dependentMap.set(dep.parentSkillId, dependents);
    }
    const knowledgeScore = existingMasteryService.calculateKnowledgeScore(input.accuracy);
    const confidenceScore = existingMasteryService.calculateConfidenceScore({
      accuracy: input.accuracy,
      attempts,
      retries,
      helpRequests: input.helpRequests,
    });

    /*
     * Consistency is composed here rather than through
     * `calculateConsistencyScore` because the history was already fetched above;
     * the formula itself is the shared pure one, so this path and
     * `processPerformance` cannot drift apart. It measures volatility, not just
     * the mean — 90 then 30 is not the same skill as 60 then 60.
     */
    const previousAccuracies = recentHistory
      .slice(0, masteryConstants.consistencyWindowSize - 1)
      .map((h) => h.knowledgeScore);
    const consistencyScore = scoring.consistencyScore([input.accuracy, ...previousAccuracies]).score;

    const retentionScore = existingMasteryService.calculateRetentionScore(
      previousHealth as SkillHealth | null,
      currentDate,
      input.accuracy,
    );

    const rawMasteryScore = existingMasteryService.calculateMasteryScore({
      knowledgeScore,
      retentionScore,
      confidenceScore,
      engagementScore: input.engagementScore,
      consistencyScore,
    });

    /*
     * MASTERED has to be earned across separate sittings, not awarded for one
     * good run. Every curriculum node asks for `mastery.attempts: 3` and nothing
     * read that number, so a first-attempt three-star lesson scored 100, was
     * declared MASTERED, and was removed from the review queue on the spot — the
     * engine congratulating the child instead of teaching them.
     *
     * The correction is a clamp on the score rather than an extra state: the
     * number then reads honestly as "strong, not yet proven", every downstream
     * consumer (bands, cadence, queue, analytics) inherits it for free, and the
     * child necessarily passes through STRONG, which is what finally makes the
     * two-day STRONG cadence reachable.
     */
    const ceiling = engineConfig.unified.evidence.unprovenScoreCeiling;
    const masteryProven = input.masteryProven ?? true;
    const masteryScore = masteryProven ? rawMasteryScore : Math.min(rawMasteryScore, ceiling);

    const masteryState = existingMasteryService.determineMasteryState(masteryScore) as MasteryState;
    const { nextReviewDate, frequencyDays } = existingMasteryService.calculateNextReviewDate(masteryState, currentDate);

    const previousScore = previousHealth?.masteryScore ?? null;
    const previousState = previousHealth?.masteryState ?? null;
    const isRegression = previousScore !== null && previousScore - masteryScore > masteryConstants.regressionDropThreshold;
    const isNewMastery = masteryState === MasteryState.MASTERED && previousState !== MasteryState.MASTERED;

    const runInTransaction = async (tx: Prisma.TransactionClient): Promise<string[]> => {
      const attemptCount = (previousHealth?.attemptCount ?? 0) + attempts;
      const retryCount = (previousHealth?.retryCount ?? 0) + retries;
      const reviewCount = previousHealth ? previousHealth.reviewCount + 1 : 1;
      const decayFactor = previousHealth?.decayFactor ?? masteryConstants.retention.decayFactor;

      await masteryEngineRepository.upsertSkillHealth(childId, skillId, { childId, skillId,
        masteryState,
        knowledgeScore,
        confidenceScore,
        retentionScore,
        engagementScore: input.engagementScore,
        consistencyScore,
        masteryScore,
        lastPracticed: currentDate,
        nextReviewDate,
        reviewCount,
        attemptCount,
        retryCount,
        decayFactor,
        frequencyDays,
      }, tx);

      await masteryEngineRepository.createSkillHistory({
        childId,
        skillId,
        knowledgeScore,
        confidenceScore,
        retentionScore,
        engagementScore: input.engagementScore,
        consistencyScore,
        masteryScore,
        masteryState,
      }, tx);

      if (isRegression && previousScore !== null && previousState) {
        await masteryEngineRepository.createRegressionLog({
          childId,
          skillId,
          previousScore,
          currentScore: masteryScore,
          previousState: previousState as MasteryState,
          currentState: masteryState,
        }, tx);
        logger.info({ childId, skillId, previousScore, currentScore: masteryScore }, 'Mastery regression logged');
      }

      if (isNewMastery) {
        await masteryEngineRepository.updateCurriculumState(childId, skillId, CurriculumState.COMPLETED, new Date(), tx);
      }

      const unlocked: string[] = [];
      if (isNewMastery) {
        const downstreamIds = dependentMap.get(skillId) ?? [];
        const curriculums = await tx.childSkillCurriculum.findMany({
          where: { childId, skillId: { in: downstreamIds } },
          select: { skillId: true, state: true },
        });
        const curriculumStateMap = new Map(curriculums.map((c) => [c.skillId, c.state]));

        const allPrereqIds = [...new Set(
          downstreamIds.flatMap((dsId) => prereqMap.get(dsId) ?? []),
        )];
        const completedPrereqRows = allPrereqIds.length > 0
          ? await tx.childSkillCurriculum.findMany({
              where: { childId, skillId: { in: allPrereqIds }, state: CurriculumState.COMPLETED },
              select: { skillId: true },
            })
          : [];
        const masteredSet = new Set(completedPrereqRows.map((c) => c.skillId));

        for (const dsId of downstreamIds) {
          const prereqs = prereqMap.get(dsId) ?? [];
          if (prereqs.length === 0 && curriculumStateMap.get(dsId) !== CurriculumState.AVAILABLE) {
            await masteryEngineRepository.updateCurriculumState(childId, dsId, CurriculumState.AVAILABLE, undefined, tx);
            unlocked.push(dsId);
          } else if (prereqs.length > 0 && prereqs.every((pId) => masteredSet.has(pId))) {
            await masteryEngineRepository.updateCurriculumState(childId, dsId, CurriculumState.AVAILABLE, undefined, tx);
            unlocked.push(dsId);
          }
        }
      }

      /*
       * A skill leaves the reinforcement queue only once it is genuinely
       * mastered. The previous condition enqueued WEAK and LEARNING only, so
       * STRONG fell through both branches: `frequencyDaysByState.strong = 2`
       * was configured, documented, and unreachable, and a skill sitting at 80
       * was never reviewed again despite being 5 points short of mastery.
       *
       * The cause is passed through because the queue is ordered by priority and
       * shows its `reason` to the parent. A skill the child just slipped
       * backwards on, one whose memory is fading, and one simply not finished yet
       * are three different situations that used to produce one identical row.
       * `detectRetentionDrop` had no callers anywhere before this line: the
       * engine's own "this is fading" signal was computed and thrown away.
       */
      if (masteryState !== MasteryState.MASTERED) {
        const fading = await reinforcementEngineService.detectRetentionDrop(
          childId, skillId, retentionScore, tx,
        );
        const cause = isRegression ? 'REGRESSION' : fading ? 'RETENTION_DROP' : 'MASTERY_GAP';

        await reinforcementEngineService.enqueueSkill(childId, skillId, {
          masteryScore,
          retentionScore,
          confidenceScore,
          masteryState,
          cause,
        }, tx);
      } else {
        await reinforcementEngineService.removeCompletedSkill(childId, skillId, tx);
      }

      return unlocked;
    };

    // Reusing the caller's transaction keeps the lesson write and the mastery
    // write atomic; opening our own preserves the standalone behaviour.
    const unlockedSkills = externalTx
      ? await runInTransaction(externalTx)
      : await prisma.$transaction(runInTransaction);

    const shouldRefresh = unlockedSkills.length > 0;
    // Inside someone else's transaction the refresh would run on a different
    // connection and could not see the uncommitted unlocks, so it is handed back
    // to the caller to run after commit.
    if (shouldRefresh && !externalTx) {
      try {
        await skillRoadmapService.refreshRoadmap(childId, 'SKILL_MASTERED');
      } catch (error) {
        logger.error({ childId, skillId, error }, 'Failed to refresh roadmap after mastery evaluation');
      }
    }

    return {
      skillId,
      previousState: (previousState as string) ?? null,
      currentState: masteryState,
      masteryScore,
      knowledgeScore,
      confidenceScore,
      retentionScore,
      consistencyScore,
      previousMasteryScore: previousScore,
      masteryScoreDelta: previousScore !== null ? masteryScore - previousScore : masteryScore,
      isRegression,
      isNewMastery,
      unlockedSkills,
      nextReviewDate: nextReviewDate.toISOString(),
      pendingRoadmapRefresh: shouldRefresh && externalTx !== undefined,
    };
  }

  async recalculateMastery(childId: string, skillId: string): Promise<MasteryEvaluationResult> {
    const history = await masteryEngineRepository.findSkillHistory(childId, skillId);
    if (history.length === 0) {
      throw new Error('No history available to recalculate mastery');
    }

    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

    const knowledgeScore = avg(history.map((h) => h.knowledgeScore));
    const confidenceScore = avg(history.map((h) => h.confidenceScore));
    const retentionScore = avg(history.map((h) => h.retentionScore));
    const engagementScore = avg(history.map((h) => h.engagementScore));
    const consistencyScore = avg(history.map((h) => h.consistencyScore));

    const masteryScore = existingMasteryService.calculateMasteryScore({
      knowledgeScore,
      retentionScore,
      confidenceScore,
      engagementScore,
      consistencyScore,
    });

    const masteryState = existingMasteryService.determineMasteryState(masteryScore) as MasteryState;
    // Both halves of the schedule come from one call. This row used to store the
    // recomputed `nextReviewDate` next to a *stale* `frequencyDays` (or a config
    // default), so the stored interval could contradict the stored date.
    const { nextReviewDate, frequencyDays } = existingMasteryService.calculateNextReviewDate(masteryState, new Date());

    const previousHealth = await masteryEngineRepository.findSkillHealth(childId, skillId);
    const previousScore = previousHealth?.masteryScore ?? null;
    const previousState = previousHealth?.masteryState ?? null;
    const isRegression = previousScore !== null && previousScore - masteryScore > masteryConstants.regressionDropThreshold;

    await prisma.$transaction(async (tx) => {
      const existing = previousHealth!;
      await masteryEngineRepository.upsertSkillHealth(childId, skillId, { childId, skillId,
        masteryState,
        knowledgeScore,
        confidenceScore,
        retentionScore,
        engagementScore,
        consistencyScore,
        masteryScore,
        lastPracticed: existing?.lastPracticed ?? new Date(),
        nextReviewDate,
        reviewCount: existing?.reviewCount ?? history.length,
        attemptCount: existing?.attemptCount ?? 0,
        retryCount: existing?.retryCount ?? 0,
        decayFactor: existing?.decayFactor ?? masteryConstants.retention.decayFactor,
        frequencyDays,
      }, tx);

      if (masteryState === MasteryState.MASTERED) {
        const curState = await masteryEngineRepository.findChildCurriculum(childId, skillId, tx);
        if (curState && curState.state !== CurriculumState.COMPLETED) {
        await masteryEngineRepository.updateCurriculumState(childId, skillId, CurriculumState.COMPLETED, new Date(), tx);
        }
      }
    });

    const recalcIsNewMastery = masteryState === MasteryState.MASTERED && previousState !== MasteryState.MASTERED;
    if (recalcIsNewMastery) {
      try {
        await skillRoadmapService.refreshRoadmap(childId, 'SKILL_MASTERED');
      } catch (error) {
        logger.error({ childId, skillId, error }, 'Failed to refresh roadmap after recalculation');
      }
    }

    return {
      skillId,
      previousState: (previousState as string) ?? null,
      currentState: masteryState,
      masteryScore,
      knowledgeScore,
      confidenceScore,
      retentionScore,
      consistencyScore,
      previousMasteryScore: previousScore,
      masteryScoreDelta: previousScore !== null ? masteryScore - previousScore : masteryScore,
      isRegression,
      isNewMastery: recalcIsNewMastery,
      unlockedSkills: [],
      nextReviewDate: nextReviewDate.toISOString(),
    };
  }

  async getSkillMastery(childId: string, skillId: string) {
    return masteryEngineRepository.findSkillHealth(childId, skillId);
  }

  async getSkillHistory(childId: string, skillId: string): Promise<SkillHistoryEntry[]> {
    const history = await masteryEngineRepository.findSkillHistory(childId, skillId);
    return history.map((h) => ({
      id: h.id,
      knowledgeScore: h.knowledgeScore,
      confidenceScore: h.confidenceScore,
      retentionScore: h.retentionScore,
      engagementScore: h.engagementScore,
      consistencyScore: h.consistencyScore,
      masteryScore: h.masteryScore,
      masteryState: h.masteryState,
      timestamp: h.timestamp.toISOString(),
    }));
  }

  async getRevisionQueue(childId: string): Promise<RevisionQueueItem[]> {
    const queue = await masteryEngineRepository.findReinforcementQueues(childId);
    return queue.map((q) => ({
      skillId: q.skillId,
      skillName: q.skill?.name ?? 'Unknown',
      masteryState: q.masteryState,
      priority: q.priority,
      reason: q.reason,
      nextReviewDate: q.nextReviewDate.toISOString(),
    }));
  }

  async processRevision(input: ProcessRevisionInput): Promise<MasteryEvaluationResult> {
    return this.evaluateMastery(input);
  }
}

export const masteryEngineService = new MasteryEngineService();
