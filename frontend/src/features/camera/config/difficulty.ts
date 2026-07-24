export type DifficultyProfileMode = 'easy' | 'normal' | 'advanced' | 'adaptive';

export interface DifficultySettings {
  holdMultiplier: number;
  repetitionOffset: number;
  timeoutMultiplier: number;
  confidenceThreshold: number;
}

export const DIFFICULTY_CONFIG: Record<DifficultyProfileMode, DifficultySettings> = {
  easy: {
    holdMultiplier: 0.6,
    repetitionOffset: 0,
    timeoutMultiplier: 1.5,
    confidenceThreshold: 0.7,
  },
  normal: {
    holdMultiplier: 1.0,
    repetitionOffset: 0,
    timeoutMultiplier: 1.0,
    confidenceThreshold: 0.8,
  },
  advanced: {
    holdMultiplier: 1.6,
    repetitionOffset: 1,
    timeoutMultiplier: 0.9,
    confidenceThreshold: 0.85,
  },
  adaptive: {
    holdMultiplier: 1.0,
    repetitionOffset: 0,
    timeoutMultiplier: 1.0,
    confidenceThreshold: 0.8,
  },
};

export const DIFFICULTY_GUARDRAILS = {
  MAX_LEVEL_BUMP_PER_SESSION: 1,
  MIN_SUCCESSES_TO_RANK_UP: 3,
  MINIMUM_ALLOWED_LEVEL: 'easy' as const,
  STORAGE_KEY: '@petalpath_camera_difficulty_history',
};
