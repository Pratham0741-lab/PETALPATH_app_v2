/**
 * LearnerFacade
 *
 * Public orchestration surface for the six existing adaptive engines
 * (mastery, adaptive, reinforcement, curriculum, session, analytics).
 *
 * Design contract:
 *   - Composes existing services — never re-implements their algorithms.
 *   - Owns the LearnerState materialized view (via LearnerStateBuilder +
 *     LearnerStateRepository).
 *   - Deprecates ad-hoc orchestration currently in adaptive.controller.ts,
 *     but does NOT replace it in Phase 1 (existing controller unchanged).
 *
 * Phase 1 surface:
 *   - getLearnerState(childId)          — read/refresh the aggregate
 *   - getNextRecommendation(childId)    — delegates to adaptive engine
 *
 * Reserved for later phases (not implemented here):
 *   - recordPerformance(childId, input)
 *   - startSession / advanceSession
 *   - getMentorContext / getAnalytics
 *
 * @see docs/adaptive-engine/design-spec.md §4.1
 */

import { roadmapService } from '../roadmap/roadmap.service.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { ActivityType } from '../../shared/enums.js';
import { NotFoundError } from '../../utils/errors.js';
import { prisma } from '../../config/database.js';
import { learnerStateBuilder } from './learner-state.builder.js';
import { learnerStateRepository } from './repositories/learner-state.repository.js';
import { recommendationRepository } from './repositories/recommendation.repository.js';
import type { LearnerStateDto } from './dto/learner-state.dto.js';
import type { RecommendationDto } from './dto/recommendation.dto.js';
import type { LearnerState } from '@prisma/client';

export class LearnerFacadeService {
  /**
   * Return the LearnerState aggregate for a child.
   *
   * Always rebuilds on read in Phase 1: the guarantee "always fresh" is
   * more valuable than the read-side latency win of caching until the
   * builder is wired to the recordPerformance write path in Phase 2.
   */
  async getLearnerState(childId: string): Promise<LearnerStateDto> {
    // Verify the child exists (surface a clean 404).
    const child = await prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: { id: true },
    });
    if (!child) {
      throw new NotFoundError('Child profile not found');
    }

    const payload = await learnerStateBuilder.build(childId);
    const persisted = await learnerStateRepository.upsert(childId, payload);
    return this.toDto(persisted);
  }

  /**
   * Return the next-best-action recommendation.
   *
   * Deterministic, read-only engine (Phase 3.4). Inspects progress, roadmap,
   * assessments, rewards and mastery, then returns the single highest-priority
   * recommendation (or `null` when the learner has no actionable signal yet).
   *
   * Priority order (highest → lowest):
   *   1. CONTINUE_LESSON   — a lesson started but not finished
   *   2. RETRY_ASSESSMENT  — a completed assessment below the pass threshold
   *   3. PRACTICE          — the child's weakest skill area
   *   4. ROADMAP           — the next unlocked, not-yet-started lesson
   *   5. REWARD            — the next reward the child is close to unlocking
   *   6. REVIEW            — a completed lesson untouched for a long time
   *
   * The signature is stable (returns `RecommendationDto | null`) so the
   * existing endpoint and consumers are unaffected.
   */
  async getNextRecommendation(childId: string): Promise<RecommendationDto | null> {
    // Read-only guard: confirm the child exists; surface a clean 404.
    const child = await prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: { id: true },
    });
    if (!child) {
      throw new NotFoundError('Child profile not found');
    }

    const profile = await prisma.learningProfile.findUnique({
      where: { childId },
      select: { preferredModality: true, optimalSessionDuration: true },
    });
    const activityType = profile?.preferredModality ?? engineConfig.session.defaultPreferredModality;
    const optimalSessionDurationMin =
      profile?.optimalSessionDuration ?? engineConfig.session.defaultOptimalDurationMinutes;
    const ttlSec = engineConfig.recommendation.ttlSec;
    const now = new Date();
    const computedAt = now.toISOString();

    // 1. Incomplete lesson — resume the in-progress lesson.
    const incompleteLesson = await recommendationRepository.findIncompleteLesson(childId);
    if (incompleteLesson) {
      return {
        kind: 'CONTINUE_LESSON',
        skillId: null,
        sessionPlanId: null,
        activityType,
        optimalSessionDurationMin,
        reasonCode: 'INCOMPLETE_LESSON',
        reasonText: `Resume "${incompleteLesson.title}" — you started it but haven't finished yet.`,
        confidence: 0.85,
        ttlSec,
        computedAt,
      };
    }

    // 2. Failed assessment retry.
    const failedAttempt = await recommendationRepository.findFailedAssessmentAttempt(
      childId,
      engineConfig.recommendation.failedAssessmentThresholdPct
    );
    if (failedAttempt) {
      const pct = Math.round(failedAttempt.percentage ?? 0);
      return {
        kind: 'RETRY_ASSESSMENT',
        skillId: null,
        sessionPlanId: null,
        activityType,
        optimalSessionDurationMin,
        reasonCode: 'FAILED_ASSESSMENT_RETRY',
        reasonText: `Retake "${failedAttempt.title}" — your last score was ${pct}%. A quick retry strengthens retention.`,
        confidence: 0.8,
        ttlSec,
        computedAt,
      };
    }

    // 3. Weak mastery area — practise the weakest skill.
    const weakSkill = await recommendationRepository.findWeakestSkill(childId);
    if (weakSkill) {
      return {
        kind: 'PRACTICE',
        skillId: weakSkill.skillId,
        sessionPlanId: null,
        activityType,
        optimalSessionDurationMin,
        reasonCode: 'WEAK_MASTERY_AREA',
        reasonText: `Practice the "${weakSkill.name}" skill — it's currently your weakest area and needs reinforcement.`,
        confidence: 0.7,
        ttlSec,
        computedAt,
      };
    }

    // 4. Continue roadmap — the next unlocked, not-yet-started lesson.
    const roadmap = await roadmapService.getRoadmap(childId);
    const currentLesson = roadmap.currentLesson;
    if (currentLesson && !currentLesson.isCompleted) {
      return {
        kind: 'ROADMAP',
        skillId: null,
        sessionPlanId: null,
        activityType,
        optimalSessionDurationMin,
        reasonCode: 'CONTINUE_ROADMAP',
        reasonText: `Continue your roadmap with "${currentLesson.title}" — the next lesson ready for you.`,
        confidence: 0.65,
        ttlSec,
        computedAt,
      };
    }

    // 5. Reward opportunity — the next reward the child is close to unlocking.
    const sticker = await recommendationRepository.findNextStickerReward(childId);
    if (sticker) {
      const needed = sticker.requiredStars - sticker.currentStars;
      return {
        kind: 'REWARD',
        skillId: null,
        sessionPlanId: null,
        activityType: ActivityType.REWARD,
        optimalSessionDurationMin,
        reasonCode: 'REWARD_OPPORTUNITY',
        reasonText: `Earn ${needed} more star${needed === 1 ? '' : 's'} to unlock the "${sticker.name}" reward!`,
        confidence: 0.6,
        ttlSec,
        computedAt,
      };
    }

    // 6. Review after long inactivity — refresh a long-completed lesson.
    const review = await recommendationRepository.findReviewCandidate(
      childId,
      engineConfig.recommendation.reviewInactivityDays
    );
    if (review) {
      return {
        kind: 'REVIEW',
        skillId: null,
        sessionPlanId: null,
        activityType,
        optimalSessionDurationMin,
        reasonCode: 'REVIEW_AFTER_INACTIVITY',
        reasonText: `Review "${review.title}" — you finished it a while ago. A quick refresher keeps it strong.`,
        confidence: 0.55,
        ttlSec,
        computedAt,
      };
    }

    // No actionable signal — let the client show its empty state.
    return null;
  }

  /**
   * Convert a persisted LearnerState row into its wire DTO.
   * Isolated so future changes to the persistence shape don't leak into
   * the HTTP surface.
   */
  private toDto(row: LearnerState): LearnerStateDto {
    return {
      childId: row.childId,
      overallMasteryScore: row.overallMasteryScore,
      masteredSkillCount: row.masteredSkillCount,
      strongSkillCount: row.strongSkillCount,
      weakSkillCount: row.weakSkillCount,
      totalSkillCount: row.totalSkillCount,
      topWeakSkillIds: (row.topWeakSkillIds as unknown as string[]) ?? [],
      topStrongSkillIds: (row.topStrongSkillIds as unknown as string[]) ?? [],
      reviewsDueCount: row.reviewsDueCount,
      reviewsDueSkillIds: (row.reviewsDueSkillIds as unknown as string[]) ?? [],
      activeSessionPlanId: row.activeSessionPlanId,
      lastCompletedSessionAt: row.lastCompletedSessionAt?.toISOString() ?? null,
      streakDays: row.streakDays,
      longestStreakDays: row.longestStreakDays,
      engagementScore: row.engagementScore,
      preferredModality: row.preferredModality,
      optimalSessionDurationMin: row.optimalSessionDurationMin,
      lastRecommendationKind: row.lastRecommendationKind,
      lastRecommendationSkillId: row.lastRecommendationSkillId,
      lastRecommendationAt: row.lastRecommendationAt?.toISOString() ?? null,
      lastRecommendationTTLSec: row.lastRecommendationTTLSec,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export const learnerFacadeService = new LearnerFacadeService();
