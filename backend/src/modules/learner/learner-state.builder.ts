/**
 * LearnerState Builder
 *
 * Pure aggregation logic: reads the current outputs of the six existing
 * engines and produces the LearnerState payload. NO writes to any table
 * other than LearnerState (owned by the repository).
 *
 * Read sources:
 *   - SkillHealth               (mastery engine)
 *   - ReinforcementQueue        (reinforcement engine)
 *   - LearningProfile           (adaptive engine)
 *   - SessionPlan               (session planner)
 *
 * NOT touched in Phase 1 (reserved for later phases):
 *   - CurriculumEngine.recommendNextSkills — recommendation caching
 *   - Streak model               (Phase 2)
 *   - RewardRule                 (Phase 2)
 *
 * @see docs/adaptive-engine/design-spec.md §4.1, §7
 */

import { prisma } from '../../config/database.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { MasteryState, SessionStatus } from '../../shared/enums.js';
import type { Prisma } from '@prisma/client';

interface BuilderPayload {
  overallMasteryScore: number;
  masteredSkillCount: number;
  strongSkillCount: number;
  weakSkillCount: number;
  totalSkillCount: number;
  topWeakSkillIds: string[];
  topStrongSkillIds: string[];
  reviewsDueCount: number;
  reviewsDueSkillIds: string[];
  activeSessionPlanId: string | null;
  lastCompletedSessionAt: Date | null;
  streakDays: number;
  longestStreakDays: number;
  engagementScore: number;
  preferredModality: Prisma.LearnerStateUpdateInput['preferredModality'];
  optimalSessionDurationMin: number;
}

export class LearnerStateBuilder {
  /**
   * Aggregate current engine outputs into a LearnerState payload for the
   * given child. Idempotent and free of side effects.
   */
  async build(childId: string): Promise<BuilderPayload> {
    const now = new Date();

    // Run reads in parallel — each is a single query against an existing
    // engine's owned table. No engine business logic is duplicated here;
    // this is pure aggregation.
    const [skillHealths, learningProfile, dueQueue, activeSession, lastSession] =
      await Promise.all([
        prisma.skillHealth.findMany({
          where: { childId },
          select: {
            skillId: true,
            masteryScore: true,
            masteryState: true,
            engagementScore: true,
          },
        }),
        prisma.learningProfile.findUnique({
          where: { childId },
          select: {
            preferredModality: true,
            optimalSessionDuration: true,
          },
        }),
        prisma.reinforcementQueue.findMany({
          where: {
            childId,
            isCompleted: false,
            nextReviewDate: { lte: now },
          },
          orderBy: [{ priority: 'desc' }, { nextReviewDate: 'asc' }],
          select: { skillId: true },
          take: engineConfig.learnerState.reviewsDueSkillIdsCount,
        }),
        prisma.sessionPlan.findFirst({
          where: {
            childId,
            status: { in: [SessionStatus.STARTED, SessionStatus.PAUSED] },
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true },
        }),
        prisma.sessionPlan.findFirst({
          where: { childId, status: SessionStatus.COMPLETED },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

    // Mastery bucket counts using the mastery-engine's state thresholds.
    // We prefer the persisted MasteryState (authoritative from mastery engine)
    // over recomputing bucketing here — no duplicated business logic.
    let mastered = 0;
    let strong = 0;
    let weak = 0;
    let sumMastery = 0;
    for (const h of skillHealths) {
      sumMastery += h.masteryScore;
      switch (h.masteryState) {
        case MasteryState.MASTERED:
          mastered += 1;
          break;
        case MasteryState.STRONG:
          strong += 1;
          break;
        case MasteryState.WEAK:
        case MasteryState.LEARNING:
          weak += 1;
          break;
      }
    }
    const total = skillHealths.length;
    const overall = total > 0 ? sumMastery / total : 0;

    // Top-N ordered slices for the FE and mentor consumers.
    const sortedByMasteryAsc = [...skillHealths].sort(
      (a, b) => a.masteryScore - b.masteryScore
    );
    const sortedByMasteryDesc = [...skillHealths].sort(
      (a, b) => b.masteryScore - a.masteryScore
    );
    const topWeakSkillIds = sortedByMasteryAsc
      .slice(0, engineConfig.learnerState.topWeakSkillsCount)
      .map((s) => s.skillId);
    const topStrongSkillIds = sortedByMasteryDesc
      .slice(0, engineConfig.learnerState.topStrongSkillsCount)
      .map((s) => s.skillId);

    // Engagement: simple mean of per-skill engagement (already tracked by
    // mastery engine). This mirrors what analytics.service.ts:calculateEngagement
    // reads, without duplicating the aggregation function.
    const engagement =
      total > 0
        ? skillHealths.reduce((acc, s) => acc + s.engagementScore, 0) / total
        : 0;

    return {
      overallMasteryScore: overall,
      masteredSkillCount: mastered,
      strongSkillCount: strong,
      weakSkillCount: weak,
      totalSkillCount: total,
      topWeakSkillIds,
      topStrongSkillIds,
      reviewsDueCount: dueQueue.length,
      reviewsDueSkillIds: dueQueue.map((q) => q.skillId),
      activeSessionPlanId: activeSession?.id ?? null,
      lastCompletedSessionAt: lastSession?.updatedAt ?? null,
      // Streak model arrives in Phase 2 — leave at zero for now.
      streakDays: 0,
      longestStreakDays: 0,
      engagementScore: engagement,
      preferredModality: learningProfile?.preferredModality ?? null,
      optimalSessionDurationMin:
        learningProfile?.optimalSessionDuration ??
        engineConfig.adaptive.sessionDuration.defaultMinutes,
    };
  }
}

export const learnerStateBuilder = new LearnerStateBuilder();
