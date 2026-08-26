/**
 * Which way of working this child finds easiest, and which they find hardest.
 *
 * ## Why this module exists
 *
 * Two things were wrong with the modality logic, and they compounded.
 *
 * First, **nothing anywhere computed a weakest modality.** Every per-modality
 * aggregation in the backend maximises: `adaptive-learning-engine
 * .calculatePreferredModality` keeps the highest score,
 * `adaptation.determinePreferredModality` keeps the highest score, and
 * `modality-performance.repository.findByChild` orders by `averageAccuracy desc`
 * so the weakest row is last and no caller ever read it that way. The engine
 * could tell you what a child was good at and had no opinion about what they
 * needed practice at — which is the only one of the two a review should act on.
 *
 * Second, the formula was written twice, inline, in two services that disagreed:
 * one used `0.4·accuracy + 0.4·engagement + 0.2·confidence`, the other
 * `0.4·accuracy + 0.4·engagement + 0.2·min(attempts, 20)` — attempts standing in
 * for confidence, which makes a much-practiced modality look preferred simply
 * because it was much practiced. Meanwhile
 * `engineConfig.adaptive.modalityScoreWeights` declared exactly those weights and
 * **had no reader at all.** This module is that reader, and it is now the only
 * copy of the formula.
 *
 * ## Two rules that keep "weakest" honest
 *
 * A low number is not evidence of weakness. It can equally be evidence of
 * absence, and acting on it would send a child to practice the modality they have
 * simply never met.
 *
 * 1. **Evidence.** A modality is only rankable once it has at least
 *    `minAttemptsForModalityEvidence` observations. `adaptation.service` already
 *    applied this rule (`if (m.attempts < 2) continue`) and it is preserved here.
 * 2. **Separation.** Being last out of four is not the same as being weak. The
 *    lowest score must sit at least `weakestModalitySeparationPoints` below the
 *    highest before it is named — otherwise all four are within noise of each
 *    other, there is no weakest, and callers should fall back to plain rotation.
 *
 * Both rules mean `weakest` is frequently `null`, and that is the correct answer.
 * A caller that cannot cope with `null` is a caller that would have invented a
 * weakness.
 *
 * Pure: no repositories, no `Date`, no randomness. Runs under the DB-free engine
 * harness, which is the only place this logic can be checked.
 */

import { ActivityType } from '../../shared/enums.js';
import { engineConfig } from '../../shared/config/engine.config.js';

/**
 * One `ModalityPerformance` row, narrowed to what the ranking reads.
 *
 * `attempts` is an **observation count**, not a tally of retries: it is the
 * number of times a session has been recorded against this modality, and it is
 * the weight the running averages were accumulated with
 * (`adaptive-learning-engine.analyzePerformance` increments it by one per call).
 * Anything that writes these rows has to keep that reading, or the averages stop
 * meaning anything.
 */
export interface ModalityObservation {
  readonly activityType: ActivityType;
  readonly attempts: number;
  readonly averageAccuracy: number;
  readonly averageEngagement: number;
  readonly averageConfidence: number;
}

export interface RankedModality {
  readonly activityType: ActivityType;
  /** 0-100, the weighted blend. */
  readonly score: number;
  readonly attempts: number;
  /** Enough observations to be worth ranking at all. */
  readonly evidenced: boolean;
}

export interface ModalityProfile {
  /** Every input row, best first. Includes unevidenced rows, flagged as such. */
  readonly ranked: readonly RankedModality[];
  /** What the child does best. Falls back to config when nothing is evidenced. */
  readonly preferred: ActivityType;
  /**
   * What the child finds hardest — or `null` when the evidence does not support
   * naming one. See the two rules above.
   */
  readonly weakest: ActivityType | null;
  /** Best evidenced score minus worst evidenced score; 0 when under two. */
  readonly spread: number;
  readonly evidencedCount: number;
  /** Why `weakest` is null, for logs and for the harness. */
  readonly weakestWithheld: 'none' | 'insufficient-evidence' | 'within-noise';
}

function clamp100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * The single weighted blend, `engineConfig.adaptive.modalityScoreWeights`.
 *
 * Divided by the weight total rather than assuming it is 1, so retuning one
 * weight in config cannot silently push scores off the 0-100 scale that
 * `weakestModalitySeparationPoints` is expressed in.
 */
export function modalityScore(observation: ModalityObservation): number {
  const w = engineConfig.adaptive.modalityScoreWeights;
  const total = w.accuracy + w.engagement + w.confidence;
  if (total <= 0) return 0;

  const blended =
    w.accuracy * clamp100(observation.averageAccuracy) +
    w.engagement * clamp100(observation.averageEngagement) +
    w.confidence * clamp100(observation.averageConfidence);

  return Math.round((blended / total) * 10) / 10;
}

/**
 * Deterministic ordering. Score decides; ties break on more evidence, then on the
 * fixed rotation order, then on the name.
 *
 * The last two tie-breaks exist for the same reason the roadmap's review ordering
 * has one: without them, two equal rows swap places depending on the order the
 * database happened to return them, so the child's "weakest" modality could change
 * on a pull-to-refresh. The name is the final resort because `modalityRotation`
 * does not contain every `ActivityType` — LISTENING, for one, is absent from it —
 * and a partial ordering would leave those rows unordered among themselves.
 */
function rotationIndex(activityType: ActivityType): number {
  const index = engineConfig.reinforcement.modalityRotation.indexOf(activityType);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function compareRanked(a: RankedModality, b: RankedModality): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.attempts !== a.attempts) return b.attempts - a.attempts;
  const byRotation = rotationIndex(a.activityType) - rotationIndex(b.activityType);
  if (byRotation !== 0) return byRotation;
  return String(a.activityType).localeCompare(String(b.activityType));
}

/**
 * Ranks a child's modalities and names the two ends of the range.
 */
export function profileModalities(
  observations: readonly ModalityObservation[]
): ModalityProfile {
  const cfg = engineConfig.adaptive;

  const ranked: RankedModality[] = observations
    .map((observation) => ({
      activityType: observation.activityType,
      score: modalityScore(observation),
      attempts: Math.max(0, Math.round(observation.attempts)),
      evidenced: observation.attempts >= cfg.minAttemptsForModalityEvidence,
    }))
    .sort(compareRanked);

  const evidenced = ranked.filter((row) => row.evidenced);

  // Nothing measured: the config default is the honest answer, and it is what
  // every existing caller already falls back to.
  const preferred = evidenced.length > 0 ? evidenced[0].activityType : cfg.defaultPreferredModality;

  if (evidenced.length < 2) {
    return {
      ranked,
      preferred,
      weakest: null,
      spread: 0,
      evidencedCount: evidenced.length,
      weakestWithheld: 'insufficient-evidence',
    };
  }

  const best = evidenced[0];
  const worst = evidenced[evidenced.length - 1];
  const spread = Math.round((best.score - worst.score) * 10) / 10;

  if (spread < cfg.weakestModalitySeparationPoints) {
    return {
      ranked,
      preferred,
      weakest: null,
      spread,
      evidencedCount: evidenced.length,
      weakestWithheld: 'within-noise',
    };
  }

  return {
    ranked,
    preferred,
    weakest: worst.activityType,
    spread,
    evidencedCount: evidenced.length,
    weakestWithheld: 'none',
  };
}

/**
 * Folds one session's measurements into a stored running average.
 *
 * Kept here, beside the reader, because the average and the thing that consumes
 * it have to agree about what `attempts` weights. `analyzePerformance` does the
 * same arithmetic for the `POST /adaptive/process` path; this is the version the
 * lesson path uses, and it is pure so the harness can check that a sequence of
 * sessions converges where it should.
 */
export function foldObservation(
  existing: ModalityObservation | null,
  sample: { accuracy: number; engagement: number; confidence: number }
): { attempts: number; averageAccuracy: number; averageEngagement: number; averageConfidence: number } {
  const accuracy = clamp100(sample.accuracy);
  const engagement = clamp100(sample.engagement);
  const confidence = clamp100(sample.confidence);

  const priorAttempts = existing ? Math.max(0, Math.round(existing.attempts)) : 0;
  if (!existing || priorAttempts <= 0) {
    return {
      attempts: 1,
      averageAccuracy: accuracy,
      averageEngagement: engagement,
      averageConfidence: confidence,
    };
  }

  const attempts = priorAttempts + 1;
  const mean = (previous: number, next: number) =>
    Math.round(((clamp100(previous) * priorAttempts + next) / attempts) * 100) / 100;

  return {
    attempts,
    averageAccuracy: mean(existing.averageAccuracy, accuracy),
    averageEngagement: mean(existing.averageEngagement, engagement),
    averageConfidence: mean(existing.averageConfidence, confidence),
  };
}
