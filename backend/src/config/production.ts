export const productionConfig = {
  pagination: {
    defaultLimit: 20,
    maxLimit: 200,
  },
  jobs: {
    cleanupIntervalMs: 60 * 60 * 1000,
    notificationRetentionDays: 30,
    sessionRetentionDays: 90,
    analyticsCacheMinutes: 5,
  },
  cache: {
    recommendationTtlMs: 60 * 1000,
  },
  timeouts: {
    default: 30000,
  },
} as const;
