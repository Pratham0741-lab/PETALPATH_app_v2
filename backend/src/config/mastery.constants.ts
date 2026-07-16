export const masteryConstants = {
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
    default: 2,
  },

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

  revisionQueue: {
    weakPriority: 3,
    learningPriority: 2,
    urgentReviewDays: 1,
    maxDailyItems: 5,
  },

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
