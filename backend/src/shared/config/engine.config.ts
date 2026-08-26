/**
 * Adaptive Learning Engine — Centralized Configuration
 *
 * Single source of truth for every threshold and tuning constant used across
 * mastery, adaptive, reinforcement, curriculum, session, analytics, and
 * recommendation engines.
 *
 * All values match the previously-hardcoded values in each service so
 * behavior is byte-identical to the pre-configuration codebase. Any future
 * tuning is done here rather than by code edits.
 *
 * @see docs/adaptive-engine/design-spec.md §4.4 and Appendix A
 */

import { ActivityType } from '../enums.js';
import { masteryConstants } from '../../config/mastery.constants.js';

export const engineConfig = {
  /**
   * Mastery engine — mastery.service.ts
   * Derived from mastery.constants.ts (single source of truth)
   */
  mastery: {
    weights: { ...masteryConstants.weights },
    stateThresholds: { ...masteryConstants.stateThresholds },
    /**
     * `reviewCadenceDays` and `defaultFrequencyDays` are **deleted**. They held
     * learning 2 / weak 1 / strong 7 / mastered 30 — the weakest band waiting
     * *longer* than the next one up, and STRONG waiting a week against the
     * product's two days. `unified.review.cadenceDaysByState` is now the only
     * cadence table; see `modules/mastery/review-cadence.ts`.
     */
    retention: { ...masteryConstants.retention },
    regressionDropThreshold: masteryConstants.regressionDropThreshold,
    confidence: { ...masteryConstants.confidence },
    consistencyWindowSize: masteryConstants.consistencyWindowSize,
  },

  adaptive: {
    weaknessThreshold: 50,
    strengthThreshold: 85,
    regressionDropThreshold: 20,
    engagement: {
      lowThreshold: 50,
      highThreshold: 85,
    },
    confidence: {
      lowThreshold: 50,
      highThreshold: 85,
    },
    /**
     * The blend behind "which way of working suits this child".
     *
     * These weights sat here **unread** while two services hard-coded them
     * inline — and disagreed: `adaptation.service` substituted
     * `min(attempts, 20)` for the confidence term, so a much-practiced modality
     * looked preferred merely because it was much practiced. There is now one
     * reader, `modules/adaptive/modality-profile.ts::modalityScore`.
     */
    modalityScoreWeights: {
      accuracy: 0.4,
      engagement: 0.4,
      confidence: 0.2,
    },
    /**
     * Observations a modality needs before it is ranked at all. A single session
     * is an anecdote, and a modality with none is *unmeasured*, not weak —
     * without this floor the engine would send every child to practice whichever
     * activity they had never opened. `adaptation.service` already applied
     * exactly this rule inline (`if (m.attempts < 2) continue`).
     */
    minAttemptsForModalityEvidence: 2,
    /**
     * How far below the child's best a modality must score, on the same 0-100
     * scale, before it is named as their weakest. Being last out of four is not
     * the same as being weak; inside this margin there is no weakest modality and
     * callers fall back to plain rotation.
     */
    weakestModalitySeparationPoints: 5,
    sessionDuration: {
      minMinutes: 10,
      maxMinutes: 45,
      stepMinutes: 5,
      defaultMinutes: 15,
    },
    velocityMinDaysGuard: 0.1,
    defaultPreferredModality: ActivityType.VIDEO,
  },

  reinforcement: {
    weakSkillMasteryThreshold: 85,
    retentionDropThreshold: 50,
    priorityLowMasteryBoostThreshold: 50,
    priorityLowMasteryBoost: 20,
    priorityWeights: {
      masteryGap: 0.5,
      retentionGap: 0.3,
      confidenceGap: 0.2,
    },
    priorityClampMax: 120,
    /**
     * `frequencyDaysByState` is **deleted**. It carried the product's numbers
     * (weak 1 / strong 2 / mastered 3) but disagreed with `mastery
     * .reviewCadenceDays`, and only WEAK and LEARNING were ever enqueued, so
     * STRONG's entry never executed. The numbers survive verbatim in
     * `unified.review.cadenceDaysByState`, which is now the only copy.
     */
    modalityRotation: [
      ActivityType.VIDEO,
      ActivityType.GAME,
      ActivityType.SPEAKING,
      ActivityType.STORY,
      ActivityType.WRITING,
    ] as ActivityType[],
    defaultFallbackModality: ActivityType.VIDEO,
  },

  curriculum: {
    skillCompletionMasteryThreshold: 85.0,
    /**
     * The skill-graph unlock threshold used to live here and disagreed with the
     * lesson gate's required score. Both now read
     * `unified.unlock.weightedThreshold`, so there is one number to change.
     */
    defaultChildAgeFallback: 5,
    defaultSubjectPriority: 50.0,
    priorityWeights: {
      masteryGap: 0.5,
      subjectPriority: 0.3,
      recency: 0.2,
    },
    generateCurriculumWeights: {
      masteryGap: 0.5,
      subjectPriority: 0.3,
    },
    recency: {
      dailyMultiplier: 10.0,
      capValue: 100.0,
      unpracticedValue: 100.0,
    },
  },

  session: {
    /**
     * When strictMode = false (Phase 1 default), session-planner behavior is
     * identical to today. Reserved for Phase 4 in the design.
     */
    strictMode: false,
    maxReinforcementRatio: 0.3,
    maxSubjectsPerSession: 2,
    ageBlockCounts: [
      { maxAge: 3, blocks: 4 },
      { maxAge: 5, blocks: 5 },
      { maxAge: 999, blocks: 6 },
    ],
    priorityWeights: {
      curriculum: 0.4,
      reinforcement: 0.3,
      modality: 0.2,
      recency: 0.1,
    },
    difficultyCurve: {
      easyIntroCutoff: 0.4,
      mediumCutoff: 0.8,
    },
    defaultPreferredModality: ActivityType.VIDEO,
    defaultOptimalDurationMinutes: 15,
  },

  analytics: {
    /**
     * Fake baseline values currently in analytics.service.ts. Kept here in
     * Phase 1 so behavior remains identical. Removal is scheduled for
     * Phase E of the design (analytics correctness pass).
     */
    baselines: {
      accuracy: 80,
      confidence: 70,
      retention: 75,
      engagement: 80,
      velocityDefault: 0.5,
      velocityFallback: 1.0,
    },
    trendMinDelta: 5,
    trendDedupeWindowHours: 24,
    subjectCompletionMasteryThreshold: 85,
    insightsMaxUnique: 3,
  },

  recommendation: {
    ttlSec: 60,
    /**
     * Deterministic engine thresholds (Phase 3.4).
     * A completed assessment attempt below this percentage is treated as a
     * "failed" attempt that should be retried.
     */
    failedAssessmentThresholdPct: 60,
    /**
     * Days of inactivity after which a completed lesson becomes a review
     * candidate (priority 6).
     */
    reviewInactivityDays: 14,
    // Placeholder — algorithm arrives in Phase 2 per design §7.2
    weights: {
      dueReviews: 0.4,
      weakSkills: 0.3,
      curriculum: 0.2,
      engagement: 0.1,
    },
    restRecommendationThresholdMin: 45,
  },

  learnerState: {
    topWeakSkillsCount: 5,
    topStrongSkillsCount: 5,
    reviewsDueSkillIdsCount: 10,
  },

  /**
   * Phase 4.1 — Learning State Engine
   * Tuning constants for mastery, confidence, and forgetting curve calculations.
   */
  intervention: {
    confidenceCollapseThreshold: 20,
    debtAccumulationThreshold: 3,
    highSeverityDebtThreshold: 0.8,
    consecutiveFailuresHigh: 3,
    consecutiveFailuresMedium: 2,
    failureRateHigh: 0.6,
    failureRateLow: 0.4,
  },

  spacing: {
    contractFailureRateThreshold: 0.5,
    contractRetryCountThreshold: 2,
    expandMasteryThreshold: 85,
    expandStabilityThreshold: 1,
  },

  learningState: {
    mastery: {
      correctBaseIncrement: 5,
      incorrectBaseDecrement: 4,
      diminishingReturnsThreshold: 5,
      penaltyAccelerationThreshold: 3,
      minValue: 0,
      maxValue: 100,
    },
    confidence: {
      baseConfidencePerStreak: 10,
      retryPenalty: 15,
      hintPenalty: 10,
      consistencyWindow: 5,
      recentPerformanceWeight: 0.4,
      maxConfidence: 100,
    },
    forgettingCurve: {
      initialStability: 0.5,
      stabilityIncrementCorrect: 0.1,
      stabilityDecrementIncorrect: 0.15,
      stabilityMin: 0.1,
      stabilityMax: 10.0,
      baseForgettingRate: 0.1,
      minForgettingRate: 0.05,
      reviewIntervalMinDays: 0,
      retentionDecayPower: 1.5,
    },
  },

  /**
   * Unified engine <-> roadmap contract.
   *
   * The adaptive engine and the roadmap used to answer the same questions from
   * different tables with different thresholds: two cadence tables that
   * disagreed, and two unlock predicates in the same file (a weighted parent
   * average over `SkillHealth` at >= 70, and an every-prerequisite test over
   * `KnowledgeState` at >= 80). This block is the single place those decisions
   * now live, so the gate and the engine agree by construction.
   *
   * `mastery.reviewCadenceDays` and `reinforcement.frequencyDaysByState` are
   * both **gone** — Stage 4 deleted them once every reader had been pointed at
   * `unified.review`. There is now exactly one cadence table in the codebase.
   */
  unified: {
    review: {
      /**
       * Authoritative cadence. Keyed by `MasteryState` values so it can be
       * indexed directly by the enum without a switch.
       *
       * WEAK returns tomorrow, STRONG in two days, MASTERED in three — the
       * spaced-repetition ladder the product asks for. `reinforcement
       * .frequencyDaysByState` held these numbers already but only WEAK and
       * LEARNING were ever enqueued, so STRONG's entry was dead config.
       */
      cadenceDaysByState: {
        NEW: 1,
        LEARNING: 1,
        WEAK: 1,
        STRONG: 2,
        MASTERED: 3,
        /**
         * Not `MasteryState` values — the adaptive-planning module labels queue
         * rows with its own vocabulary and used to keep a third private cadence
         * table for them. Listing them here is what let that table be deleted.
         */
        NEEDS_PRACTICE: 1,
        STABLE: 2,
        REINFORCEMENT: 2,
      } as Readonly<Record<string, number>>,
      defaultCadenceDays: 1,
      /** Schedule to the start of a local day rather than +24h. */
      useCalendarDays: true,
      /** IST. Replace with a per-child field when `Child` grows one. */
      timezoneOffsetMinutes: 330,
      /**
       * A skill stays in the reinforcement queue until it scores at or above
       * this. Matches `reinforcement.weakSkillMasteryThreshold` so the enqueue
       * decision and the weak-skill sweep cannot disagree.
       */
      keepInQueueBelowScore: 85,
      /**
       * Priority added on top of the gap-based score according to *why* a skill
       * was queued. A skill that slipped backwards is more urgent than one that
       * was merely never finished, and the queue is ordered by priority — so
       * without these the two are indistinguishable to the child.
       *
       * `SCHEDULED` and `MASTERY_GAP` add nothing on purpose: they are the
       * ordinary cases, and boosting everything boosts nothing.
       *
       * `PREREQUISITE_GAP` also adds nothing, and that is not an oversight: a
       * gap skill is written with mastery 0, so the gap terms alone already
       * score it above a merely-weak skill (105 vs 88). It earns its place at
       * the front of the queue from the numbers rather than from a thumb on the
       * scale. Placement used to hand-assign 5 for a gap and 3 for a weak
       * skill, on a scale where every engine-written row scores 70+.
       */
      priorityBoosts: {
        REGRESSION: 25,
        RETENTION_DROP: 15,
        MASTERY_GAP: 0,
        PREREQUISITE_GAP: 0,
        SCHEDULED: 0,
      } as Readonly<Record<string, number>>,
    },

    unlock: {
      /**
       * Weighted-average-with-a-floor. The weighted mean of prerequisite
       * mastery must clear `weightedThreshold`, *and* no single prerequisite may
       * sit below `perPrerequisiteFloor`. The mean preserves the engine's
       * partial-credit intelligence; the floor stops one badly-missed
       * prerequisite from being averaged away by its siblings.
       */
      weightedThreshold: 70,
      perPrerequisiteFloor: 50,
      /**
       * The gate reads a high-water mark, not the live decaying score, so a
       * lesson a child already unlocked never re-locks while they sleep. The
       * live score still drives review scheduling.
       */
      useHighWaterMark: true,
      /** A prerequisite must also be finished, not merely scored. */
      requirePrerequisiteCompletion: true,
    },

    evidence: {
      /**
       * Fallback for a node that declares neither a usable `mastery.attempts` nor
       * a difficulty in `requiredSessionsByDifficulty`.
       */
      defaultRequiredAttempts: 3,
      /**
       * How many separate practice sessions MASTERED needs, by
       * `CurriculumNode.difficulty`.
       *
       * **Why difficulty and not the node's own `mastery.attempts`:** that field
       * reads 3 on all 1209 curriculum nodes, and `mastery.required_score` reads
       * 80 on all 1209. Neither carries any per-node information — they are
       * authoring defaults. `difficulty` is the one field with a real spread
       * (1:100, 2:397, 3:467, 4:159, 5:86), so it is the only signal available
       * for making an easy lesson feel different from a hard one.
       *
       * The effect a child feels: a difficulty-1 counting lesson is proven after
       * two clean passes instead of three, and stops being clamped by
       * `unprovenScoreCeiling`; a difficulty-5 lesson now asks for four. Same
       * engine, different patience.
       *
       * A node that declares `mastery.attempts` *differing from*
       * `defaultRequiredAttempts` still wins — see
       * `modules/progress/lesson-evidence.ts`. That is how a curriculum author
       * overrides this table for one lesson.
       */
      requiredSessionsByDifficulty: { 1: 2, 2: 2, 3: 3, 4: 4, 5: 4 } as Readonly<
        Record<number, number>
      >,
      /**
       * The absolute floor, under every other rule. Without it a single lucky
       * 3-star run scored 100 and the skill left the review queue on the spot —
       * the engine congratulating rather than teaching. Two sessions is the
       * anti-lucky-run rule; a third and fourth are about difficulty, which is
       * `requiredSessionsByDifficulty`' job. (Was a flat 3, which floored the
       * whole difficulty table back to 3 and made it inert.)
       */
      minSessionsForMastered: 2,
      /**
       * When evidence is insufficient the mastery score is clamped just below
       * the MASTERED threshold. This is deliberately a clamp on the *score*
       * rather than a special case in the state machine: the number then
       * honestly reads "good, but not yet proven".
       */
      unprovenScoreCeiling: 84,
      engagement: {
        /** Seconds of focused work treated as a full-value session. */
        targetSessionSeconds: 180,
        weights: { coverage: 0.5, duration: 0.3, persistence: 0.2 },
        /** Showing up at all is worth something. */
        minScoreWhenAttempted: 20,
      },
      /** Blend of mean and volatility used for the consistency dimension. */
      consistency: { volatilityWeight: 1.0 },
      /**
       * How the two behavioural terms of the confidence dimension are blended
       * before they scale accuracy: `independence` (no help needed) and
       * `directness` (no repeat attempts needed). See
       * `modules/mastery/mastery-scoring.ts::confidenceScore` — the dimension
       * used to be built from penalties alone, which scored a child who did
       * nothing at 100.
       */
      confidence: { independenceWeight: 0.5, directnessWeight: 0.5 },
    },

    roadmap: {
      /**
       * 'soft' surfaces due reviews ahead of the next new lesson but still lets
       * the child proceed; 'hard' refuses the new lesson at the API. Starting
       * soft, because a hard gate plus any scoring bug equals a child who
       * cannot play.
       */
      gateMode: 'soft' as 'soft' | 'hard',
      /** Reviews spliced in front of any one new lesson. */
      maxReviewsAhead: 2,
      /** Reviews surfaced across a whole day, so a bad week isn't a wall. */
      maxReviewsPerDay: 3,
      /**
       * Minutes to budget per skill when the day's reviews are presented as one
       * "practice session" stop on the roadmap. A figure, not a measurement:
       * reviews reuse an existing lesson's activities and no timing of a review
       * is recorded anywhere, so this is the same honest estimate
       * `dynamic-roadmap-builder.service` already used per reinforcement item.
       * Config rather than a literal because it is the kind of number a parent
       * will eventually argue with.
       */
      practiceMinutesPerSkill: 5,
    },
  },
} as const;

export type EngineConfig = typeof engineConfig;
