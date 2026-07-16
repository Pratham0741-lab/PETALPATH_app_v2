import { prisma } from '../../config/database.js';
import { masteryEngineService as existingMasteryService } from '../mastery/mastery.service.js';
import { skillRoadmapService } from '../skill-roadmap/skill-roadmap.service.js';
import { reinforcementEngineService } from '../reinforcement/reinforcement-engine.service.js';
import { masteryEngineRepository } from './mastery-engine.repository.js';
import { masteryConstants } from '../../config/mastery.constants.js';
import { CurriculumState, MasteryState } from '../../shared/enums.js';
import { logger } from '../../utils/logger.js';
import type { EvaluateMasteryInput, MasteryEvaluationResult, ProcessRevisionInput, RevisionQueueItem, SkillHistoryEntry } from './mastery-engine.types.js';
import type { SkillHealth } from '@prisma/client';

export class MasteryEngineService {
  async evaluateMastery(input: EvaluateMasteryInput): Promise<MasteryEvaluationResult> {
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
    const confidenceScore = existingMasteryService.calculateConfidenceScore(retries, input.helpRequests);

    const previousAccuracies = recentHistory
      .slice(0, masteryConstants.consistencyWindowSize - 1)
      .map((h) => h.knowledgeScore);
    const allAccuracies = [input.accuracy, ...previousAccuracies];
    const consistencyScore = allAccuracies.reduce((s, v) => s + v, 0) / allAccuracies.length;

    const retentionScore = existingMasteryService.calculateRetentionScore(
      previousHealth as SkillHealth | null,
      currentDate,
      input.accuracy,
    );

    const masteryScore = existingMasteryService.calculateMasteryScore({
      knowledgeScore,
      retentionScore,
      confidenceScore,
      engagementScore: input.engagementScore,
      consistencyScore,
    });

    const masteryState = existingMasteryService.determineMasteryState(masteryScore) as MasteryState;
    const { nextReviewDate, frequencyDays } = existingMasteryService.calculateNextReviewDate(masteryState, currentDate);

    const previousScore = previousHealth?.masteryScore ?? null;
    const previousState = previousHealth?.masteryState ?? null;
    const isRegression = previousScore !== null && previousScore - masteryScore > masteryConstants.regressionDropThreshold;
    const isNewMastery = masteryState === MasteryState.MASTERED && previousState !== MasteryState.MASTERED;

    const unlockedSkills = await prisma.$transaction(async (tx) => {
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

      if (masteryState === MasteryState.WEAK || masteryState === MasteryState.LEARNING) {
        await reinforcementEngineService.enqueueSkill(childId, skillId, {
          masteryScore,
          retentionScore,
          confidenceScore,
          masteryState,
        }, tx);
      }

      if (masteryState === MasteryState.MASTERED) {
        await reinforcementEngineService.removeCompletedSkill(childId, skillId, tx);
      }

      return unlocked;
    });

    const shouldRefresh = unlockedSkills.length > 0;
    if (shouldRefresh) {
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
    const { nextReviewDate } = existingMasteryService.calculateNextReviewDate(masteryState, new Date());

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
        frequencyDays: existing?.frequencyDays ?? masteryConstants.reviewCadenceDays.default,
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
