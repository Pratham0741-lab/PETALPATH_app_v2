/**
 * Shared Enum Re-exports
 * 
 * Single canonical import point for all domain enums.
 * Modules MUST import enums from here — not directly from '@prisma/client'.
 * 
 * This decouples application code from the ORM layer. If the persistence
 * layer ever changes (e.g. Prisma → Drizzle), only this file needs updating.
 */
export {
  ActivityType,
  AdaptationEventType,
  MasteryState,
  CurriculumState,
  ReinforcementEventType,
  SessionStatus,
  SessionBlockStatus,
  SessionEventType,
  DifficultyLevel,
  AnalyticsMetricType,
  TrendEventType,
} from '@prisma/client';
