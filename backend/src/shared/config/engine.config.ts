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

export const engineConfig = {
  /**
   * Mastery engine — mastery.service.ts
   */
  mastery: {
    weights: {
      knowledge: 0.35,
      retention: 0.25,
      confidence: 0.2,
      engagement: 0.1,
      consistency: 0.1,
    },
    stateThresholds: {
      learning: 40,
      weak: 60,
      strong: 85,
    },
    reviewCadenceDays: {
      learning: 2,
      weak: 1,
      strong: 7,
      mastered: 30,
    },
    retention: {
      decayFactor: 0.995,
      initialRetention: 100.0,
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
    defaultFrequencyDays: 2,
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
    modalityScoreWeights: {
      accuracy: 0.4,
      engagement: 0.4,
      confidence: 0.2,
    },
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
    frequencyDaysByState: {
      weak: 1,
      strong: 2,
      mastered: 3,
      default: 1,
    },
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
    unlockRatioThreshold: 70.0,
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
} as const;

export type EngineConfig = typeof engineConfig;
