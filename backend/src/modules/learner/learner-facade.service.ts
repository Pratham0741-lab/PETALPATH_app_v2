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

import { adaptiveLearningEngineService } from '../adaptive/adaptive-learning-engine.service.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { RecommendationKind } from '../../shared/enums.js';
import { NotFoundError } from '../../utils/errors.js';
import { prisma } from '../../config/database.js';
import { learnerStateBuilder } from './learner-state.builder.js';
import { learnerStateRepository } from './repositories/learner-state.repository.js';
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
   * Phase 1 behavior: delegates to the existing adaptive engine's modality
   * and duration recommendation to preserve current behavior. The advanced
   * decision tree (§7.2 of the design) arrives in Phase 2 — this method's
   * signature will remain stable so downstream consumers do not need to
   * change.
   */
  async getNextRecommendation(childId: string): Promise<RecommendationDto> {
    // Ensure a LearnerState exists so the ETag / version numbers are stable.
    await this.getLearnerState(childId);

    const [preferredModality, optimalSessionDuration] = await Promise.all([
      adaptiveLearningEngineService.recommendModality(childId),
      adaptiveLearningEngineService.recommendSessionDuration(childId),
    ]);

    const now = new Date();
    return {
      kind: RecommendationKind.PRACTICE,
      skillId: null,
      sessionPlanId: null,
      activityType: preferredModality,
      optimalSessionDurationMin: optimalSessionDuration,
      reasonCode: 'ADAPTIVE_MODALITY_AND_DURATION',
      reasonText: `Recommends ${preferredModality} activities in ${optimalSessionDuration} minute sessions based on the child's recent performance.`,
      confidence: 0.5, // Phase 1 placeholder — real confidence in Phase 2 §7.2.
      ttlSec: engineConfig.recommendation.ttlSec,
      computedAt: now.toISOString(),
    };
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
