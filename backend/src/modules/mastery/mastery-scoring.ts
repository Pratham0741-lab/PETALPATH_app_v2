/**
 * Mastery scoring — the five dimensions, as pure functions.
 *
 * Extracted from `mastery.service.ts` so the formulas can be executed and
 * asserted without a database (`scripts/engine-harness/run.sh`). The service
 * keeps its public methods and delegates here; nothing about persistence,
 * transactions or logging belongs in this file.
 *
 * Why the dimensions were rebuilt
 * -------------------------------
 * Executing the previous formulas showed that roughly 30 of the 100 available
 * points were awarded for participation alone, independently of whether the
 * child was learning anything:
 *
 *   - `confidenceScore(0, 0)` returned **100**. Confidence was assembled purely
 *     from penalties, so a child who did nothing — and therefore incurred no
 *     retries and asked for no help — scored perfectly on it.
 *   - `retentionScore(null, now, 80)` returned **100** because a first-ever
 *     success was awarded `initialRetention`, asserting perfect recall of
 *     something that had not yet been recalled once.
 *   - consistency was a plain mean, so a child alternating 90 and 30 scored the
 *     same as a child steady at 60. The dimension named "consistency" was blind
 *     to volatility.
 *
 * Net effect: one star on every activity in a lesson (50% accuracy) composed to
 * 65, which the bands read as STRONG. The bands were not too generous; the
 * dimensions were handing out points nobody had earned.
 *
 * The rebuild keeps the documented weights and bands (design-spec §4.4)
 * untouched and instead makes each dimension earn its points from evidence. A
 * fully-engaged child now scores approximately `0.9 * accuracy + 10`, so the
 * bands land where they read: 50% is WEAK, 70% is STRONG, 90% is MASTERED once
 * proven across sessions.
 */

import { engineConfig } from '../../shared/config/engine.config.js';
import { MasteryState } from '../../shared/enums.js';

/**
 * The part of `SkillHealth` retention needs. Structural on purpose, so a real
 * `SkillHealth` row satisfies it and the harness can pass a literal.
 */
export interface RetentionMemory {
  readonly retentionScore: number;
  readonly lastPracticed: Date | string;
  readonly decayFactor?: number | null;
}

export interface ConfidenceInput {
  /** 0-100 for this window. Confidence is credited in proportion to it. */
  readonly accuracy: number;
  /** Attempts in this window, used as the denominator for retries. */
  readonly attempts: number;
  /** Attempts beyond the first per activity. */
  readonly retries: number;
  /** Hints or help taps in this window. */
  readonly helpRequests: number;
}

export interface ConsistencyResult {
  /** 0-100. Mean accuracy less its volatility. */
  readonly score: number;
  /** How many observations the score is based on. 1 means "no history yet". */
  readonly samples: number;
  readonly mean: number;
  /** Population standard deviation of the window. 0 for a single sample. */
  readonly volatility: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Knowledge is accuracy, unchanged: what the child actually got right. */
export function knowledgeScore(accuracy: number): number {
  return clamp(accuracy, 0, 100);
}

/**
 * Confidence — how surely the child arrived at a correct answer.
 *
 * Two behavioural terms, each 0-1: `independence` (did they need help?) and
 * `directness` (did they need repeat attempts?). Their weighted blend then
 * scales **accuracy**, which is the change that matters: confidence is credit
 * for getting something right without props, not credit for the absence of
 * struggle. A child who confidently produces wrong answers is not confident,
 * and a child who did nothing at all now scores 0 rather than 100.
 *
 * Retries are normalized against the attempts actually made rather than a flat
 * ceiling, so three retries spread over twelve attempts is not read as the same
 * struggle as three retries over three. `retryNormalizationCeiling` survives as
 * a floor on that denominator: in a one-attempt window a single retry should not
 * erase the whole dimension.
 */
export function confidenceScore(input: ConfidenceInput): number {
  const cfg = engineConfig.mastery.confidence;
  const w = engineConfig.unified.evidence.confidence;

  const attempts = Math.max(0, input.attempts);
  const retries = Math.max(0, input.retries);
  const helpRequests = Math.max(0, input.helpRequests);

  const retryDenominator = Math.max(attempts, cfg.retryNormalizationCeiling);
  const directness = 1 - clamp(retries / retryDenominator, 0, 1);
  const independence = 1 - clamp(helpRequests / cfg.helpNormalizationCeiling, 0, 1);

  const behaviour = clamp(w.independenceWeight * independence + w.directnessWeight * directness, 0, 1);
  return clamp(knowledgeScore(input.accuracy) * behaviour, 0, 100);
}

/**
 * Retention — how much of this skill is expected to have survived since it was
 * last practiced.
 *
 * First session: the baseline **is** today's accuracy, capped by
 * `initialRetention`. Nothing has been retained across a gap yet, so there is no
 * honest basis for claiming more. (Lowering `initialRetention` below 100 makes
 * first sessions more conservative still; it is the ceiling a single session may
 * assert.)
 *
 * Later sessions: decay the stored value over the elapsed days, then move it
 * *toward* today's demonstrated accuracy — up by at most `successBoost` on a
 * successful review, down by at most `failurePenalty` on a failed one, and never
 * past the accuracy itself. Capping the movement is what makes this spaced
 * repetition rather than a reset button: a memory that has decayed to nothing is
 * rebuilt over several sessions, not restored by one good day.
 */
/**
 * How much of a stored retention score survives `daysElapsed` without practice.
 *
 * Extracted so the two consumers cannot drift. `retentionScore` below applies
 * this at *write* time, when the child practices again; `review-cadence.ts`
 * applies the same curve when a stale row is *read*. Both are needed because
 * there is no scheduler in this backend — nothing would otherwise ever age a
 * score between one practice session and the next.
 */
export function decayRetention(
  storedRetention: number,
  daysElapsed: number,
  decayFactor?: number | null
): number {
  const factor = decayFactor ?? engineConfig.mastery.retention.decayFactor;
  return clamp(storedRetention * Math.pow(factor, Math.max(0, daysElapsed)), 0, 100);
}

export function retentionScore(
  previous: RetentionMemory | null,
  now: Date,
  accuracy: number
): number {
  const cfg = engineConfig.mastery.retention;
  const current = knowledgeScore(accuracy);

  if (!previous) {
    return clamp(Math.min(current, cfg.initialRetention), 0, 100);
  }

  const lastPracticed = new Date(previous.lastPracticed);
  const elapsedMs = now.getTime() - lastPracticed.getTime();
  const daysElapsed = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24));

  const decayed = decayRetention(previous.retentionScore, daysElapsed, previous.decayFactor);

  if (current >= cfg.successAccuracyThreshold) {
    // Consolidate toward what was just demonstrated, in bounded steps.
    const target = Math.max(decayed, current);
    return clamp(Math.min(target, decayed + cfg.successBoost), 0, 100);
  }

  // A failed review is evidence the memory was weaker than the stored number.
  const target = Math.min(decayed, current);
  return clamp(Math.max(target, decayed - cfg.failurePenalty), 0, 100);
}

/**
 * Consistency — a steady learner scores above a volatile one at the same mean.
 *
 * `mean - volatilityWeight * stdev` over the accuracy window. The previous plain
 * mean could not distinguish 90/30 from 60/60, which is precisely the difference
 * between a skill that is holding and one that is not.
 *
 * A single sample has no volatility to measure, so the score is the mean. That
 * makes consistency equal accuracy on a first pass — deliberate: the alternative
 * (dropping the dimension and renormalizing the remaining weights) *raises* a
 * struggling child's score, and inventing a damping constant would punish them
 * for history they have had no opportunity to build.
 */
export function consistencyScore(accuracies: readonly number[]): ConsistencyResult {
  const values = accuracies.filter((v) => Number.isFinite(v)).map((v) => clamp(v, 0, 100));
  if (values.length === 0) {
    return { score: 0, samples: 0, mean: 0, volatility: 0 };
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (values.length < 2) {
    return { score: clamp(mean, 0, 100), samples: values.length, mean, volatility: 0 };
  }

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const volatility = Math.sqrt(variance);
  const weight = engineConfig.unified.evidence.consistency.volatilityWeight;

  return {
    score: clamp(mean - weight * volatility, 0, 100),
    samples: values.length,
    mean,
    volatility,
  };
}

/**
 * Which band a score falls in (design-spec §4.4).
 *
 * Lives here rather than on the service so the lazy-read projection in
 * `review-cadence.ts` can re-band a *decayed* score without importing the
 * service (which owns persistence, and would be a cycle).
 * `mastery.service.determineMasteryState` delegates to this.
 */
export function masteryStateFor(masteryScore: number): MasteryState {
  const t = engineConfig.mastery.stateThresholds;
  if (masteryScore < t.learning) return MasteryState.LEARNING;
  if (masteryScore < t.weak) return MasteryState.WEAK;
  if (masteryScore < t.strong) return MasteryState.STRONG;
  return MasteryState.MASTERED;
}

export interface DimensionScores {
  readonly knowledgeScore: number;
  readonly retentionScore: number;
  readonly confidenceScore: number;
  readonly engagementScore: number;
  readonly consistencyScore: number;
}

/**
 * The documented weighted combination (design-spec §4.4). Weights are unchanged
 * by the rebuild: with evidence-based dimensions they no longer need to be.
 */
export function combineDimensions(scores: DimensionScores): number {
  const w = engineConfig.mastery.weights;
  const score =
    w.knowledge * clamp(scores.knowledgeScore, 0, 100) +
    w.retention * clamp(scores.retentionScore, 0, 100) +
    w.confidence * clamp(scores.confidenceScore, 0, 100) +
    w.engagement * clamp(scores.engagementScore, 0, 100) +
    w.consistency * clamp(scores.consistencyScore, 0, 100);
  return clamp(score, 0, 100);
}
