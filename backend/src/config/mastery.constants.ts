export const masteryConstants = {
  stateThresholds: {
    learning: 40,
    weak: 60,
    strong: 85,
  },

  /**
   * `reviewCadenceDays` used to live here: learning 2, weak 1, strong 7,
   * mastered 30. It is deleted rather than retuned, because two other tables
   * held the same decision with different numbers. The single cadence table is
   * `engineConfig.unified.review.cadenceDaysByState`, read through
   * `modules/mastery/review-cadence.ts`.
   *
   * Worth knowing if these numbers are ever revisited: `decayFactor` below is
   * per-day, so 0.995^30 ≈ 0.86 — a month untouched costs a skill only about
   * 3.5 mastery points. Decay is a nudge; **cadence** is what brings a topic
   * back. Lengthening an interval is a much bigger change than it looks.
   */
  retention: {
    decayFactor: 0.995,
    initialRetention: 100,
    successAccuracyThreshold: 80,
    successBoost: 30,
    failurePenalty: 10,
  },

  regressionDropThreshold: 20,

  confidence: {
    retryNormalizationCeiling: 5,
    helpNormalizationCeiling: 5,
  },

  consistencyWindowSize: 5,

  weights: {
    knowledge: 0.35,
    retention: 0.25,
    confidence: 0.2,
    engagement: 0.1,
    consistency: 0.1,
  },

  /**
   * `revisionQueue` used to live here: `weakPriority: 3`, `learningPriority: 2`,
   * `urgentReviewDays: 1`, `maxDailyItems: 5`. It had **no readers** — a fourth
   * answer to questions that already had owners:
   *
   *   - the 3/2 priorities are on the same small scale placement hand-assigned
   *     (`isGap ? 5 : 3`), which sorted every placement finding below every
   *     engine-written row on the engine's 0–120 scale. Priority now comes from
   *     `review-cadence.ts::reviewPriority` for every writer.
   *   - `urgentReviewDays: 1` is `unified.review.cadenceDaysByState.WEAK`.
   *   - `maxDailyItems: 5` disagreed with `unified.roadmap.maxReviewsPerDay: 3`,
   *     which is the one the roadmap reads.
   */
  unlock: {
    completedState: 'COMPLETED' as const,
    availableState: 'AVAILABLE' as const,
    unlockRatio: 1,
  },

  curriculumState: {
    active: 'ACTIVE' as const,
    completed: 'COMPLETED' as const,
    available: 'AVAILABLE' as const,
  },
} as const;

export type MasteryConstants = typeof masteryConstants;
