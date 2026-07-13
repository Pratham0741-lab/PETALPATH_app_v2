export enum RoadmapSectionType {
  RECOVERY = 'RECOVERY',
  DAILY_PRACTICE = 'DAILY_PRACTICE',
  MASTERY_PRACTICE = 'MASTERY_PRACTICE',
  NEW_LEARNING = 'NEW_LEARNING',
  REINFORCEMENT = 'REINFORCEMENT',
  REWARD = 'REWARD',
}

export enum SessionBlockType {
  DAILY_PRACTICE = 'DAILY_PRACTICE',
  MASTERY_PRACTICE = 'MASTERY_PRACTICE',
  RECOVERY = 'RECOVERY',
  NEW_LEARNING = 'NEW_LEARNING',
  REINFORCEMENT = 'REINFORCEMENT',
  REWARD = 'REWARD',
  WELCOME = 'WELCOME',
  SUMMARY = 'SUMMARY',
}

export enum RecoveryModeStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export enum LearningDebtType {
  PRACTICE = 'PRACTICE',
  REINFORCEMENT = 'REINFORCEMENT',
  REVIEW = 'REVIEW',
}

export enum ReinforcementQueueStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

export enum PracticeType {
  DAILY = 'DAILY',
  MASTERY = 'MASTERY',
  REINFORCEMENT = 'REINFORCEMENT',
}

export enum ActivityType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  SPEAKING = 'SPEAKING',
  WRITING = 'WRITING',
  GAME = 'GAME',
  STORY = 'STORY',
  REWARD = 'REWARD',
  WELCOME = 'WELCOME',
  SUMMARY = 'SUMMARY',
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD',
}

export const VALID_ROADMAP_SECTION_TYPES = Object.values(RoadmapSectionType);
export const VALID_SESSION_BLOCK_TYPES = Object.values(SessionBlockType);
export const VALID_RECOVERY_MODE_STATUSES = Object.values(RecoveryModeStatus);
export const VALID_LEARNING_DEBT_TYPES = Object.values(LearningDebtType);
export const VALID_REINFORCEMENT_QUEUE_STATUSES = Object.values(ReinforcementQueueStatus);
export const VALID_PRACTICE_TYPES = Object.values(PracticeType);
export const VALID_ACTIVITY_TYPES = Object.values(ActivityType);
export const VALID_DIFFICULTY_LEVELS = Object.values(DifficultyLevel);