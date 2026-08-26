/**
 * The learner path's writer for `ModalityPerformance` and `LearningProfile`.
 *
 * ## Why this had to be built
 *
 * Both tables were read by four different services and written by none of them on
 * any path a child could reach. `LearningProfile` had exactly two writers —
 * `POST /api/adaptation/:childId/analyze` and `POST /api/adaptive/process` — and
 * the app calls neither; `intelligenceApi.ts` only ever GETs the profile and the
 * recommendations. So `reinforcement-engine.selectActivityType` read a row that
 * did not exist and fell through to `defaultFallbackModality` **every single
 * time**: every review, for every child, was VIDEO. `session-planner`,
 * `learner-facade` and `learner-state.builder` did the same.
 *
 * The tables were not the problem. Nothing was filling them in.
 *
 * `lesson-completion.service` already gathers real per-modality signals in order
 * to score the lesson — genuine 0-100 scores for speak and write, completion
 * flags and stars for video and listen. That measurement was being computed,
 * used once, and thrown away. This service keeps it.
 *
 * ## Deliberately not inside the completion transaction
 *
 * Same reasoning as the review-history write: these repositories take no `tx`, so
 * called from inside they would run on a second connection and block on the
 * transaction's own uncommitted rows. And telemetry must never be able to fail a
 * lesson — a four-year-old finished their work either way. Every call site
 * therefore runs after commit, inside a try/catch, and the profile self-heals on
 * the next completion.
 *
 * ## One thing this fixes by omission
 *
 * `adaptation.service.ts` upserts `averageEngagement: 60` and
 * `averageConfidence: 50` — literal constants, for every modality — *over* the
 * measured values. Nothing here fabricates a number: a modality the child has not
 * attempted gets no row at all.
 */

import { ActivityType } from '../../shared/enums.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { logger } from '../../utils/logger.js';
import { learningProfileRepository } from './repositories/learning-profile.repository.js';
import { modalityPerformanceRepository } from './repositories/modality-performance.repository.js';
import {
  foldObservation,
  profileModalities,
  type ModalityObservation,
  type ModalityProfile,
} from './modality-profile.js';
import type { ModalitySample } from '../progress/lesson-evidence.js';

export class ModalityTelemetryService {
  /**
   * Folds one lesson's per-modality work into the child's running profile.
   *
   * Returns the recomputed profile so a caller can log what the child's session
   * actually changed, which is the only way to tell adaptation from noise.
   */
  async recordLessonModalities(
    childId: string,
    samples: readonly ModalitySample[]
  ): Promise<ModalityProfile | null> {
    if (samples.length === 0) {
      return null;
    }

    /*
     * A lesson can present the same modality more than once, and two rows for one
     * `activityType` would violate the table's unique constraint on the second
     * upsert — or, worse, race. Merge first, then write once per modality: one
     * lesson is one observation of each way of working, which is what the
     * `attempts`-weighted average assumes.
     */
    const merged = new Map<ActivityType, { accuracy: number; engagement: number; confidence: number; count: number }>();
    for (const sample of samples) {
      const existing = merged.get(sample.activityType);
      if (existing) {
        existing.accuracy += sample.accuracy;
        existing.engagement += sample.engagement;
        existing.confidence += sample.confidence;
        existing.count += 1;
      } else {
        merged.set(sample.activityType, {
          accuracy: sample.accuracy,
          engagement: sample.engagement,
          confidence: sample.confidence,
          count: 1,
        });
      }
    }

    const now = new Date();
    for (const [activityType, totals] of merged) {
      const existing = await modalityPerformanceRepository.findByChildAndModality(
        childId,
        activityType
      );
      const folded = foldObservation(existing, {
        accuracy: totals.accuracy / totals.count,
        engagement: totals.engagement / totals.count,
        confidence: totals.confidence / totals.count,
      });
      await modalityPerformanceRepository.upsert(childId, activityType, {
        ...folded,
        lastUsedAt: now,
      });
    }

    return this.refreshLearningProfile(childId);
  }

  /**
   * Recomputes `LearningProfile` from every `ModalityPerformance` row.
   *
   * The three averages are weighted by `attempts`, so a modality the child has
   * practiced ten times counts for more than one they met once — an unweighted
   * mean let a single anecdote move the whole profile.
   *
   * `optimalSessionDuration` and `learningVelocity` are **preserved, not
   * recomputed.** They are owned by `adaptive-learning-engine`, which measures
   * them from session duration and mastery history — data this call does not have.
   * Overwriting them with a plausible-looking default is how the constants in
   * `adaptation.service` came to exist, and the upsert replaces every column, so
   * saying nothing is not an option: they have to be read and put back.
   */
  async refreshLearningProfile(childId: string): Promise<ModalityProfile | null> {
    const rows = await modalityPerformanceRepository.findByChild(childId);
    if (rows.length === 0) {
      return null;
    }

    const observations: ModalityObservation[] = rows.map((row) => ({
      activityType: row.activityType as ActivityType,
      attempts: row.attempts,
      averageAccuracy: row.averageAccuracy,
      averageEngagement: row.averageEngagement,
      averageConfidence: row.averageConfidence,
    }));
    const profile = profileModalities(observations);

    const totalAttempts = observations.reduce((sum, row) => sum + Math.max(0, row.attempts), 0);
    const weighted = (pick: (row: ModalityObservation) => number) => {
      if (totalAttempts <= 0) return 0;
      const sum = observations.reduce(
        (acc, row) => acc + pick(row) * Math.max(0, row.attempts),
        0
      );
      return Math.round((sum / totalAttempts) * 100) / 100;
    };

    const existing = await learningProfileRepository.findByChildId(childId);

    await learningProfileRepository.upsert(childId, {
      averageAccuracy: weighted((row) => row.averageAccuracy),
      averageEngagement: weighted((row) => row.averageEngagement),
      averageConfidence: weighted((row) => row.averageConfidence),
      optimalSessionDuration:
        existing?.optimalSessionDuration ?? engineConfig.adaptive.sessionDuration.defaultMinutes,
      preferredModality: profile.preferred,
      learningVelocity: existing?.learningVelocity ?? 0,
    });

    logger.debug(
      {
        childId,
        preferred: profile.preferred,
        weakest: profile.weakest,
        withheld: profile.weakestWithheld,
        spread: profile.spread,
        evidenced: profile.evidencedCount,
      },
      'Modality profile refreshed'
    );

    return profile;
  }

  /**
   * The child's current modality profile, or `null` when nothing is recorded yet.
   *
   * Callers must treat `null` — and a non-null profile whose `weakest` is `null` —
   * as "no opinion", not as a weakness. See `modality-profile.ts` for why that
   * distinction is load-bearing.
   */
  async getProfile(childId: string): Promise<ModalityProfile | null> {
    const rows = await modalityPerformanceRepository.findByChild(childId);
    if (rows.length === 0) {
      return null;
    }
    return profileModalities(
      rows.map((row) => ({
        activityType: row.activityType as ActivityType,
        attempts: row.attempts,
        averageAccuracy: row.averageAccuracy,
        averageEngagement: row.averageEngagement,
        averageConfidence: row.averageConfidence,
      }))
    );
  }
}

export const modalityTelemetryService = new ModalityTelemetryService();
