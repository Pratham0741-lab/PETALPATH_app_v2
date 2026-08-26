/**
 * When a skill comes back — the one cadence, decay and priority module.
 *
 * Why this file exists
 * --------------------
 * "Weak topics return tomorrow, strong topics after two days" was implemented
 * three separate times, in three tables that disagreed:
 *
 *   - `mastery.constants.reviewCadenceDays` — learning 2, weak 1, strong 7,
 *     mastered 30. Note learning (the weakest band) waited *longer* than weak.
 *   - `reinforcement.frequencyDaysByState` — weak 1, strong 2, mastered 3. The
 *     product's numbers, but only WEAK and LEARNING were ever enqueued, so
 *     STRONG's entry never executed.
 *   - `adaptive-planning/.../reinforcement-queue.service.ts` — a private literal
 *     map, reachable through the mounted `/v1/adaptive-planning` routes.
 *
 * Each of the three then wrote `new Date(now + days * 24 * 60 * 60 * 1000)`,
 * which is *24 hours*, not "tomorrow": a lesson finished at 23:50 came due at
 * 23:50 the next night. All three now delegate here, and here schedules to the
 * start of a local calendar day via `shared/utils/calendar-day.ts`.
 *
 * The second job: **lazy decay.** There is no scheduler anywhere in this
 * backend, so nothing ages a `SkillHealth` row between one practice session and
 * the next. A row read a month after it was written still claims the retention
 * it had on the day it was written. `projectDecayedHealth` applies the decay at
 * read time using the same curve the write path uses, so a queue sweep judges
 * the child as they are today rather than as they were.
 *
 * Everything here is pure — no repositories, no transactions — so
 * `scripts/engine-harness/run.sh` can execute it without a database.
 */

import { MasteryState } from '../../shared/enums.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { addCalendarDays, calendarDaysBetween, elapsedDays, isDue } from '../../shared/utils/calendar-day.js';
import { decayRetention, masteryStateFor } from './mastery-scoring.js';

/**
 * Why a skill is in the review queue. This is not cosmetic: it sets the
 * priority boost, and it is the only thing that can make the queue's `reason`
 * string true. The previous code wrote a hardcoded "Mastery score N is below
 * 85% reinforcement threshold." onto every row, including rows queued because
 * the child had just regressed.
 */
export type ReviewCause =
  | 'REGRESSION'
  | 'RETENTION_DROP'
  | 'MASTERY_GAP'
  | 'PREREQUISITE_GAP'
  | 'SCHEDULED';

export interface ReviewSchedule {
  readonly nextReviewDate: Date;
  readonly frequencyDays: number;
}

/** The part of a `SkillHealth` row this module needs. Structural, so a real row satisfies it. */
export interface HealthSnapshot {
  readonly masteryScore: number;
  readonly retentionScore: number;
  readonly confidenceScore: number;
  readonly masteryState: MasteryState | string;
  readonly lastPracticed: Date | string;
  readonly decayFactor?: number | null;
}

export interface DecayedHealth {
  /** Mastery score with today's retention substituted in. */
  readonly masteryScore: number;
  readonly retentionScore: number;
  readonly confidenceScore: number;
  /** Re-banded from the decayed score, so a slipped skill reports as slipped. */
  readonly masteryState: MasteryState;
  /** Whole local days since the child last practiced this skill. */
  readonly daysSincePractice: number;
  /** Retention points lost to the gap. 0 when practiced today. */
  readonly retentionLost: number;
  /** Mastery points lost as a result. Small by design — see `decayFactor`. */
  readonly masteryLost: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function offsetMinutes(): number {
  return engineConfig.unified.review.timezoneOffsetMinutes;
}

/**
 * How many days until this skill should be seen again.
 *
 * Accepts a plain string as well as the enum because the adaptive-planning
 * queue labels rows with its own vocabulary (`NEEDS_PRACTICE`, `STABLE`,
 * `REINFORCEMENT`); those are listed in `cadenceDaysByState` alongside the
 * `MasteryState` values so one table can serve both callers.
 */
export function cadenceDaysFor(state: MasteryState | string | null | undefined): number {
  const review = engineConfig.unified.review;
  if (!state) return review.defaultCadenceDays;
  return review.cadenceDaysByState[String(state)] ?? review.defaultCadenceDays;
}

/**
 * The next review date for a state, scheduled to the start of a local day.
 *
 * Returns `frequencyDays` alongside it because both `SkillHealth.frequencyDays`
 * and `ReviewSchedule.reviewFrequency` persist the interval, and deriving it
 * twice is how the stored interval drifts from the stored date.
 */
export function nextReviewDateFor(
  state: MasteryState | string | null | undefined,
  from: Date = new Date()
): ReviewSchedule {
  const frequencyDays = cadenceDaysFor(state);
  const review = engineConfig.unified.review;

  const nextReviewDate = review.useCalendarDays
    ? addCalendarDays(from, frequencyDays, offsetMinutes())
    : new Date(from.getTime() + frequencyDays * 24 * 60 * 60 * 1000);

  return { nextReviewDate, frequencyDays };
}

/**
 * Has a scheduled review come due? Compares local calendar days, so a review
 * set for "tomorrow" is available from the moment the child wakes up rather
 * than from the hour they happened to finish yesterday.
 */
export function isReviewDue(
  nextReviewDate: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!nextReviewDate) return true; // never scheduled: due as soon as anyone asks
  return isDue(new Date(nextReviewDate), now, offsetMinutes());
}

/** Whole local days since the child last practiced. 0 means "today". */
export function daysSincePractice(lastPracticed: Date | string, now: Date = new Date()): number {
  return Math.max(0, calendarDaysBetween(new Date(lastPracticed), now, offsetMinutes()));
}

/**
 * A stored health row as it stands *today*.
 *
 * Only retention decays. Knowledge, engagement and consistency are records of
 * what happened and must not be rewritten by the passage of time; confidence is
 * likewise an observation. Because `combineDimensions` is a linear weighted
 * sum, substituting one dimension is exact: subtracting
 * `weights.retention * retentionLost` from the stored mastery score gives
 * precisely the score the full composition would produce. No need to store or
 * re-fetch the other four dimensions.
 *
 * Fractional elapsed days are used for the curve (so it moves smoothly) while
 * whole local days are reported (so "3 days ago" means three sleeps).
 */
export function projectDecayedHealth(health: HealthSnapshot, now: Date = new Date()): DecayedHealth {
  const practiced = new Date(health.lastPracticed);
  const fractionalDays = elapsedDays(practiced, now);

  const retentionScore = decayRetention(health.retentionScore, fractionalDays, health.decayFactor);
  const retentionLost = Math.max(0, health.retentionScore - retentionScore);
  const masteryLost = engineConfig.mastery.weights.retention * retentionLost;
  const masteryScore = clamp(health.masteryScore - masteryLost, 0, 100);

  return {
    masteryScore,
    retentionScore,
    confidenceScore: health.confidenceScore,
    masteryState: masteryStateFor(masteryScore),
    daysSincePractice: daysSincePractice(practiced, now),
    retentionLost,
    masteryLost,
  };
}

/**
 * Does this skill still belong in the review queue?
 *
 * Judged on the *decayed* score, which is the point: a skill that scored 86 and
 * has not been touched since should not be treated as permanently finished
 * because of one good day two months ago.
 */
export function needsReview(health: HealthSnapshot, now: Date = new Date()): boolean {
  return projectDecayedHealth(health, now).masteryScore < engineConfig.unified.review.keepInQueueBelowScore;
}

export interface PriorityInput {
  readonly masteryScore: number;
  readonly retentionScore: number;
  readonly confidenceScore: number;
  readonly cause?: ReviewCause;
}

/**
 * Queue priority — how far this skill is from healthy, plus why it is here.
 *
 * The gap terms and the low-mastery boost are the pre-existing formula,
 * unchanged. Two things are new: the cause boost (a regression outranks a skill
 * that was simply never finished) and the clamp, which reads the
 * `reinforcement.priorityClampMax` that had sat in config with no reader — so
 * priority is now a bounded scale rather than an open-ended number whose top
 * end depended on how many boosts happened to apply.
 */
export function reviewPriority(input: PriorityInput): number {
  const cfg = engineConfig.reinforcement;
  const w = cfg.priorityWeights;

  const masteryGap = 100 - clamp(input.masteryScore, 0, 100);
  const retentionGap = 100 - clamp(input.retentionScore, 0, 100);
  const confidenceGap = 100 - clamp(input.confidenceScore, 0, 100);

  let priority = w.masteryGap * masteryGap + w.retentionGap * retentionGap + w.confidenceGap * confidenceGap;

  if (input.masteryScore < cfg.priorityLowMasteryBoostThreshold) {
    priority += cfg.priorityLowMasteryBoost;
  }
  priority += engineConfig.unified.review.priorityBoosts[input.cause ?? 'SCHEDULED'] ?? 0;

  return Math.round(clamp(priority, 0, cfg.priorityClampMax));
}

/**
 * The queue row's `reason`, in words a parent can read.
 *
 * `ReinforcementQueue.reason` is a user-facing string that reached the parent
 * dashboard reading "Mastery score 43.2 is below 85% reinforcement threshold."
 * — accurate to the config and meaningless to a parent, and identical whether
 * the child had regressed or simply not finished. The cause now picks the
 * sentence.
 */
export function describeReviewCause(cause: ReviewCause, skillTitle?: string): string {
  const subject = skillTitle ? `“${skillTitle}”` : 'this skill';
  switch (cause) {
    case 'REGRESSION':
      return `${subject} slipped back noticeably in the last session, so it comes back first.`;
    case 'RETENTION_DROP':
      return `${subject} is fading — it has not been practiced in a while.`;
    case 'MASTERY_GAP':
      return `${subject} is still being learned and needs more practice to stick.`;
    case 'PREREQUISITE_GAP':
      return `${subject} is a building block for what comes next, so it is worth practicing first.`;
    case 'SCHEDULED':
    default:
      return `${subject} is due for its regular practice.`;
  }
}
