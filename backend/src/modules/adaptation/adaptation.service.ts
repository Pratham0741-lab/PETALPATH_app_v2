import { prisma } from '../../config/database.js';
import { adaptationRepository } from './adaptation.repository.js';
import { skillRoadmapService } from '../skill-roadmap/skill-roadmap.service.js';
import { logger } from '../../utils/logger.js';
import { ActivityType, AdaptationEventType, MasteryState } from '../../shared/enums.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { nextReviewDateFor } from '../mastery/review-cadence.js';
import type {
  PersonalizationFactors,
  LearnerProfile,
  AdaptationSummary,
  AdaptationChange,
  CompletedSessionData,
} from './adaptation.types.js';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export class AdaptationService {
  async analyze(childId: string): Promise<AdaptationSummary> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * MILLIS_PER_DAY);
    const sevenDaysAgo = new Date(now.getTime() - 7 * MILLIS_PER_DAY);

    const [
      oldProfile,
      healths,
      completedSessions,
      allSessions,
      history,
      modalities,
    ] = await Promise.all([
      adaptationRepository.findLearningProfile(childId),
      adaptationRepository.findSkillHealths(childId),
      adaptationRepository.findCompletedSessions(childId, thirtyDaysAgo),
      adaptationRepository.findSessionPlans(childId, thirtyDaysAgo),
      adaptationRepository.findSkillHistorySince(childId, sevenDaysAgo),
      adaptationRepository.findModalityPerformances(childId),
    ]);

    const changes: AdaptationChange[] = [];

    const {
      factors,
      newProfile,
      reviewUpdates,
      modalityUpdates,
    } = this.computePersonalization(
      healths,
      completedSessions,
      allSessions,
      history,
      modalities,
      oldProfile,
    );

    if (oldProfile) {
      if (Math.abs(oldProfile.averageAccuracy - newProfile.averageAccuracy) > 2) {
        changes.push({ type: 'profile', field: 'averageAccuracy', previousValue: oldProfile.averageAccuracy, newValue: newProfile.averageAccuracy, reason: 'Accuracy trend shift' });
      }
      if (Math.abs(oldProfile.optimalSessionDuration - newProfile.optimalSessionDuration) >= 5) {
        changes.push({ type: 'session_duration', field: 'optimalSessionDuration', previousValue: oldProfile.optimalSessionDuration, newValue: newProfile.optimalSessionDuration, reason: 'Session duration optimization' });
      }
      if (oldProfile.preferredModality !== newProfile.preferredModality) {
        changes.push({ type: 'modality_preference', field: 'preferredModality', previousValue: oldProfile.preferredModality, newValue: newProfile.preferredModality, reason: 'Modality preference shift based on performance' });
      }
    }

    let roadmapRefreshed = false;

    await prisma.$transaction(async (tx) => {
      await adaptationRepository.upsertLearningProfile(childId, {
        averageAccuracy: newProfile.averageAccuracy,
        averageEngagement: newProfile.averageEngagement,
        averageConfidence: newProfile.averageConfidence,
        optimalSessionDuration: newProfile.optimalSessionDuration,
        preferredModality: newProfile.preferredModality,
        learningVelocity: newProfile.learningVelocity,
      }, tx);

      if (reviewUpdates.length > 0) {
        await adaptationRepository.batchUpdateSkillHealths(childId, reviewUpdates, tx);
      }

      for (const m of modalityUpdates) {
        await adaptationRepository.upsertModalityPerformance(childId, m.activityType, {
          attempts: m.attempts,
          averageAccuracy: m.averageAccuracy,
          averageEngagement: m.averageEngagement,
          averageConfidence: m.averageConfidence,
          lastUsedAt: m.lastUsedAt,
        }, tx);
      }

      if (factors.struggleIndex > 60) {
        await adaptationRepository.createAdaptationEvent(
          childId,
          AdaptationEventType.WEAKNESS_DETECTED,
          `High struggle index (${factors.struggleIndex.toFixed(1)}) detected`,
          { struggleIndex: factors.struggleIndex, learningSpeed: factors.learningSpeed },
          tx,
        );
      }

      if (factors.confidenceTrend === 'declining' && factors.confidenceStability < 40) {
        await adaptationRepository.createAdaptationEvent(
          childId,
          AdaptationEventType.CONFIDENCE_DROP,
          `Confidence declining (stability: ${factors.confidenceStability.toFixed(1)})`,
          { confidenceStability: factors.confidenceStability },
          tx,
        );
      }

      if (factors.confidenceTrend === 'improving') {
        await adaptationRepository.createAdaptationEvent(
          childId,
          AdaptationEventType.CONFIDENCE_IMPROVEMENT,
          `Confidence improving`,
          { learningMomentum: factors.learningMomentum },
          tx,
        );
      }
    });

    const needsRoadmapRefresh =
      changes.some((c) => c.type === 'profile' || c.type === 'modality_preference') ||
      factors.learningSpeed < 40 ||
      factors.struggleIndex > 60 ||
      (oldProfile && Math.abs(oldProfile.learningVelocity - newProfile.learningVelocity) > 10);

    if (needsRoadmapRefresh) {
      try {
        await skillRoadmapService.refreshRoadmap(childId, 'CURRICULUM_UPDATED');
        roadmapRefreshed = true;
      } catch (error) {
        logger.error({ childId, error }, 'Failed to refresh roadmap after adaptation');
      }
    }

    return {
      childId,
      factors,
      profile: newProfile,
      changes,
      roadmapRefreshed,
      analyzedAt: now.toISOString(),
    };
  }

  async getProfile(childId: string): Promise<{ profile: LearnerProfile | null; factors: PersonalizationFactors | null }> {
    const [profile, healths, completedSessions, allSessions, history, modalities] = await Promise.all([
      adaptationRepository.findLearningProfile(childId),
      adaptationRepository.findSkillHealths(childId),
      adaptationRepository.findCompletedSessions(childId, new Date(Date.now() - 30 * MILLIS_PER_DAY)),
      adaptationRepository.findSessionPlans(childId, new Date(Date.now() - 30 * MILLIS_PER_DAY)),
      adaptationRepository.findSkillHistorySince(childId, new Date(Date.now() - 7 * MILLIS_PER_DAY)),
      adaptationRepository.findModalityPerformances(childId),
    ]);

    if (!profile && healths.length === 0) {
      return { profile: null, factors: null };
    }

    const { factors } = this.computePersonalization(
      healths,
      completedSessions,
      allSessions,
      history,
      modalities,
      profile,
    );

    return { profile, factors };
  }

  private computePersonalization(
    healths: Array<{
      skillId: string;
      /** Needed so review cadence is keyed on the band the mastery engine assigned. */
      masteryState: MasteryState;
      knowledgeScore: number;
      confidenceScore: number;
      retentionScore: number;
      engagementScore: number;
      consistencyScore: number;
      masteryScore: number;
      lastPracticed: Date;
      nextReviewDate: Date;
      reviewCount: number;
      attemptCount: number;
      retryCount: number;
      decayFactor: number;
      frequencyDays: number;
    }>,
    completedSessions: CompletedSessionData[],
    allSessions: Array<{ id: string; status: string; durationMinutes: number; startedAt: Date | null; completedAt: Date | null }>,
    history: Array<{ knowledgeScore: number; confidenceScore: number; retentionScore: number; engagementScore: number; consistencyScore: number; masteryScore: number; timestamp: Date }>,
    modalities: Array<{ activityType: string; attempts: number; averageAccuracy: number; averageEngagement: number; averageConfidence: number; lastUsedAt: Date }>,
    oldProfile: LearnerProfile | null,
  ): {
    factors: PersonalizationFactors;
    newProfile: LearnerProfile;
    reviewUpdates: Array<{ skillId: string; frequencyDays: number; decayFactor: number; nextReviewDate: Date }>;
    modalityUpdates: Array<{ activityType: string; attempts: number; averageAccuracy: number; averageEngagement: number; averageConfidence: number; lastUsedAt: Date }>;
  } {
    const now = Date.now();

    // 1. Learning Speed — average accuracy across completed sessions
    const sessionAccuracies = completedSessions
      .filter((s) => s.sessionBlocks.length > 0)
      .map((s) => {
        const completed = s.sessionBlocks.filter((b) => b.status === 'COMPLETED');
        return completed.length / Math.max(s.sessionBlocks.length, 1);
      });
    const learningSpeed = sessionAccuracies.length > 0
      ? (sessionAccuracies.reduce((a, b) => a + b, 0) / sessionAccuracies.length) * 100
      : (healths.reduce((sum, h) => sum + h.knowledgeScore, 0) / Math.max(healths.length, 1));

    // 2. Confidence Trend
    const sortedHistory = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const confidenceTrend = this.computeTrend(sortedHistory, 'confidenceScore');

    // 3. Retention Trend
    const retentionTrend = this.computeTrend(sortedHistory, 'retentionScore');

    // 4. Review Performance — accuracy on reinforcement blocks
    const reviewBlocks = completedSessions.flatMap((s) => s.sessionBlocks.filter((b) => b.isReinforcement && b.status === 'COMPLETED'));
    const reviewPerformance = reviewBlocks.length > 0
      ? (reviewBlocks.length / Math.max(
          completedSessions.flatMap((s) => s.sessionBlocks.filter((b) => b.isReinforcement)).length,
          1,
        )) * 100
      : 50;

    // 5. Mastery Velocity — new masteries per 30 days
    const masteryVelocity = healths.filter((h) => {
      const masteryNames = ['MASTERED', 'STRONG'];
      return masteryNames.includes(h.masteryScore >= 80 ? 'MASTERED' : '') && h.reviewCount > 0;
    }).length / Math.max(1, 30 / 7);

    // 6. Struggle Index — frequency of low scores
    const lowScoreCount = healths.filter((h) => h.knowledgeScore < 60).length;
    const struggleIndex = healths.length > 0 ? (lowScoreCount / healths.length) * 100 : 0;

    // 7. Consistency Score — inverse of variance across skills
    const scores = healths.map((h) => h.masteryScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const variance = scores.length > 0
      ? scores.reduce((sum, s) => sum + (s - avgScore) ** 2, 0) / scores.length
      : 0;
    const consistencyScore = Math.max(0, 100 - Math.sqrt(variance));

    // 8. Session Completion Rate
    const completedCount = allSessions.filter((s) => s.status === 'COMPLETED').length;
    const sessionCompletionRate = allSessions.length > 0 ? (completedCount / allSessions.length) * 100 : 100;

    // 9. Average Session Time
    const sessionTimes = allSessions
      .filter((s) => s.status === 'COMPLETED' && s.durationMinutes > 0)
      .map((s) => s.durationMinutes);
    const averageSessionTime = sessionTimes.length > 0
      ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length
      : 20;

    // 10. Difficulty Preference
    const difficultyCounts: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const session of completedSessions) {
      for (const block of session.sessionBlocks) {
        if (block.status === 'COMPLETED') {
          difficultyCounts[block.difficulty] = (difficultyCounts[block.difficulty] ?? 0) + 1;
        }
      }
    }
    const totalBlocks = Object.values(difficultyCounts).reduce((a, b) => a + b, 0);
    const difficultyPreference = totalBlocks > 0
      ? ((difficultyCounts['HARD'] ?? 0) * 3 + (difficultyCounts['MEDIUM'] ?? 0) * 2 + (difficultyCounts['EASY'] ?? 0)) / totalBlocks
      : 2;

    // 11. Knowledge Stability
    const knowledgeScores = healths.map((h) => h.knowledgeScore);
    const avgKnowledge = knowledgeScores.length > 0
      ? knowledgeScores.reduce((a, b) => a + b, 0) / knowledgeScores.length
      : 0;
    const knowledgeVariance = knowledgeScores.length > 0
      ? knowledgeScores.reduce((sum, s) => sum + (s - avgKnowledge) ** 2, 0) / knowledgeScores.length
      : 0;
    const knowledgeStability = Math.max(0, 100 - Math.sqrt(knowledgeVariance));

    // 12. Confidence Stability
    const confidenceScores = healths.map((h) => h.confidenceScore);
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;
    const confidenceVariance = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, s) => sum + (s - avgConfidence) ** 2, 0) / confidenceScores.length
      : 0;
    const confidenceStability = Math.max(0, 100 - Math.sqrt(confidenceVariance));

    // 13. Review Frequency
    const overdueReviews = healths.filter((h) => h.nextReviewDate.getTime() < now).length;
    const reviewFrequency = healths.length > 0
      ? healths.reduce((sum, h) => sum + h.frequencyDays, 0) / healths.length
      : 7;
    const reviewFrequencyDays = overdueReviews > healths.length * 0.3
      ? Math.max(1, reviewFrequency - 1)
      : overdueReviews === 0
        ? Math.min(14, reviewFrequency + 0.5)
        : reviewFrequency;

    // 14. Learning Momentum
    const momentum = sortedHistory.length >= 2
      ? this.computeMomentum(sortedHistory)
      : 0;

    // 15. Engagement Trend
    const engagementTrend = this.computeTrend(sortedHistory, 'engagementScore');

    // Determine preferred modality
    const preferredModality = this.determinePreferredModality(modalities);

    // Compute profile values
    const averageAccuracy = healths.length > 0
      ? healths.reduce((sum, h) => sum + h.knowledgeScore, 0) / healths.length
      : 0;
    const averageEngagement = healths.length > 0
      ? healths.reduce((sum, h) => sum + h.engagementScore, 0) / healths.length
      : 50;
    const averageConfidence = healths.length > 0
      ? healths.reduce((sum, h) => sum + h.confidenceScore, 0) / healths.length
      : 50;
    const optimalSessionDuration = Math.round(
      Math.max(5, Math.min(60, averageSessionTime + (struggleIndex > 50 ? -5 : learningSpeed > 70 ? 5 : 0))),
    );
    const learningVelocity = healths.length > 0
      ? healths.filter((h) => h.masteryScore >= 80).length / Math.max(1, healths.length) * 100
      : 0;

    const factors: PersonalizationFactors = {
      learningSpeed: Math.round(learningSpeed * 10) / 10,
      confidenceTrend,
      retentionTrend,
      reviewPerformance: Math.round(reviewPerformance * 10) / 10,
      masteryVelocity: Math.round(masteryVelocity * 10) / 10,
      struggleIndex: Math.round(struggleIndex * 10) / 10,
      consistencyScore: Math.round(consistencyScore * 10) / 10,
      sessionCompletionRate: Math.round(sessionCompletionRate * 10) / 10,
      averageSessionTime: Math.round(averageSessionTime * 10) / 10,
      difficultyPreference: Math.round(difficultyPreference * 10) / 10,
      knowledgeStability: Math.round(knowledgeStability * 10) / 10,
      confidenceStability: Math.round(confidenceStability * 10) / 10,
      reviewFrequencyDays: Math.round(reviewFrequencyDays * 10) / 10,
      learningMomentum: Math.round(momentum * 10) / 10,
      engagementTrend,
    };

    const newProfile: LearnerProfile = {
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      averageEngagement: Math.round(averageEngagement * 10) / 10,
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      optimalSessionDuration,
      preferredModality: preferredModality as ActivityType,
      learningVelocity: Math.round(learningVelocity * 10) / 10,
    };

    /**
     * Per-skill review parameters.
     *
     * What used to be here was a fourth cadence implementation, and a mutating
     * one — it rewrote `frequencyDays`, `decayFactor` and `nextReviewDate` on
     * every `SkillHealth` row of the child:
     *
     *   adjustedFrequency = knowledge >= 80 && confidence >= 70
     *     ? min(30, base + 2)          // walk it out towards a month
     *     : max(1, base - 1)           // or pull it in
     *   newDecayFactor = knowledge >= 80
     *     ? min(0.95, decay + 0.02)
     *     : max(0.7, decay - 0.02)
     *   nextReviewDate = now + adjustedFrequency * 24h
     *
     * Three problems. First, it drifted: `base + 2` reads the value it wrote
     * last time, so the interval depended on how many times anyone had POSTed
     * `/adaptation/:childId/analyze` rather than on the child — repeated calls
     * walked every healthy skill to the 30-day ceiling Stage 4 deleted. Second,
     * it decided from `knowledgeScore`/`confidenceScore` what `masteryState`
     * already decides from the same numbers, so it was a second, worse banding.
     * Third, the decay clamp `[0.7, 0.95]` could never reach the engine's 0.995,
     * so one call permanently replaced a gentle forgetting curve (14% retention
     * lost in a month) with a severe one (79%) — and it accelerated forgetting
     * for precisely the child who was already struggling.
     *
     * Cadence is now read from the one table, keyed on the state the mastery
     * engine assigned. That is not less adaptive: `masteryState` *is* the
     * per-skill, per-child signal. `decayFactor` is written as the shared
     * constant so rows created by older code paths (placement's 0.9, the
     * repository's old 0.5 default) converge onto one curve instead of keeping
     * whichever value their provenance gave them.
     */
    const nowDate = new Date();
    const reviewUpdates = healths.map((h) => {
      const { nextReviewDate, frequencyDays } = nextReviewDateFor(h.masteryState, nowDate);
      return {
        skillId: h.skillId,
        frequencyDays,
        decayFactor: engineConfig.mastery.retention.decayFactor,
        nextReviewDate,
      };
    });

    // Estimated modality performance from session data
    // NOTE: Engagement and confidence are estimated (60/50 constants), not actual
    // measurements. Only accuracy is derived from completion status (80/40 split).
    // These values indicate relative modality usage frequency, not true performance.
    const modalityEstimateMap = new Map<string, { totalAccuracy: number; totalEngagement: number; totalConfidence: number; count: number; lastUsed: Date }>();
    for (const session of completedSessions) {
      for (const block of session.sessionBlocks) {
        const key = block.activityType;
        if (!key) continue;
        const existing = modalityEstimateMap.get(key) ?? { totalAccuracy: 0, totalEngagement: 0, totalConfidence: 0, count: 0, lastUsed: new Date(0) };
        existing.count++;
        existing.totalAccuracy += block.status === 'COMPLETED' ? 80 : 40;
        existing.totalEngagement += 60;
        existing.totalConfidence += 50;
        if (session.completedAt && session.completedAt > existing.lastUsed) {
          existing.lastUsed = session.completedAt;
        }
        modalityEstimateMap.set(key, existing);
      }
    }

    const modalityUpdates = [...modalityEstimateMap.entries()].map(([activityType, data]) => ({
      activityType,
      attempts: data.count,
      averageAccuracy: Math.round((data.totalAccuracy / data.count) * 10) / 10,
      averageEngagement: Math.round((data.totalEngagement / data.count) * 10) / 10,
      averageConfidence: Math.round((data.totalConfidence / data.count) * 10) / 10,
      lastUsedAt: data.lastUsed,
    }));

    return { factors, newProfile, reviewUpdates, modalityUpdates };
  }

  private computeTrend(
    history: Array<{ timestamp: Date; [key: string]: unknown }>,
    field: string,
  ): 'improving' | 'stable' | 'declining' {
    if (history.length < 2) return 'stable';

    const recent = history.slice(-Math.min(history.length, 5));
    const first = recent[0][field] as number;
    const last = recent[recent.length - 1][field] as number;
    const diff = last - first;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  private computeMomentum(
    history: Array<{ knowledgeScore: number; timestamp: Date }>,
  ): number {
    if (history.length < 2) return 0;

    const recent = history.slice(-Math.min(history.length, 10));
    const n = recent.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = recent.reduce((a, r) => a + r.knowledgeScore, 0);
    const sumXY = indices.reduce((sum, i) => sum + i * recent[i].knowledgeScore, 0);
    const sumX2 = indices.reduce((sum, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * NOTE: this is **not** the shared modality formula, and it disagrees with it.
   * `Math.min(m.attempts, 20) * 0.2` stands in for the confidence term, so a
   * much-practiced modality reads as preferred merely because it was much
   * practiced. It also returns the literal `'GAME'` for a child with no rows,
   * while every other fallback in the system is VIDEO.
   *
   * Left as-is rather than quietly re-pointed, because this method is reached
   * only through `POST /api/adaptation/:childId/analyze` — which the app never
   * calls, and which also overwrites the real per-modality measurements with the
   * constants 60 and 50 a few lines earlier. Fixing the formula without fixing
   * that would just compute a better answer from fabricated inputs.
   *
   * The one to trust: `modules/adaptive/modality-profile.ts::profileModalities`,
   * the single reader of `engineConfig.adaptive.modalityScoreWeights`.
   */
  private determinePreferredModality(
    modalities: Array<{ activityType: string; attempts: number; averageAccuracy: number; averageEngagement: number; lastUsedAt: Date }>,
  ): string {
    if (modalities.length === 0) return 'GAME';

    let bestModality = modalities[0].activityType;
    let bestScore = -1;

    for (const m of modalities) {
      if (m.attempts < 2) continue;
      const score = m.averageAccuracy * 0.4 + m.averageEngagement * 0.4 + Math.min(m.attempts, 20) * 0.2;
      if (score > bestScore) {
        bestScore = score;
        bestModality = m.activityType;
      }
    }

    return bestModality;
  }
}

export const adaptationService = new AdaptationService();
