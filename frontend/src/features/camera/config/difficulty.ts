export type DifficultyProfileMode = 'easy' | 'normal' | 'advanced' | 'adaptive';

export interface DifficultySettings {
  holdMultiplier: number;
  repetitionOffset: number;
  timeoutMultiplier: number;
  confidenceThreshold: number;
}

/**
 * `confidenceThreshold` is compared against the graded confidence the pose
 * primitives return, where a pose at the edge of tolerance scores 0.60 and a
 * clean one approaches 1.00. The old values (0.70 / 0.80 / 0.85) were set when
 * every primitive returned a constant 0.65, so they were unreachable — and
 * harmless only because nothing compared against them. Now that the comparison
 * is live they are calibrated to the real scale:
 *
 *   easy      0.60 — any pose within tolerance counts
 *   normal    0.68 — a little better than the bare edge
 *   advanced  0.78 — clearly, unambiguously the right pose
 *
 * `CameraRulesEngine` takes `Math.max` of this and the activity's own floor, so
 * a profile can tighten the requirement but never drop below it.
 */
export const DIFFICULTY_CONFIG: Record<DifficultyProfileMode, DifficultySettings> = {
  easy: {
    holdMultiplier: 0.6,
    repetitionOffset: 0,
    timeoutMultiplier: 1.5,
    confidenceThreshold: 0.6,
  },
  normal: {
    holdMultiplier: 1.0,
    repetitionOffset: 0,
    timeoutMultiplier: 1.0,
    confidenceThreshold: 0.68,
  },
  advanced: {
    holdMultiplier: 1.6,
    repetitionOffset: 1,
    timeoutMultiplier: 0.9,
    confidenceThreshold: 0.78,
  },
  adaptive: {
    holdMultiplier: 1.0,
    repetitionOffset: 0,
    timeoutMultiplier: 1.0,
    confidenceThreshold: 0.68,
  },
};

export const DIFFICULTY_GUARDRAILS = {
  MAX_LEVEL_BUMP_PER_SESSION: 1,
  MIN_SUCCESSES_TO_RANK_UP: 3,
  MINIMUM_ALLOWED_LEVEL: 'easy' as const,
  STORAGE_KEY: '@petalpath_camera_difficulty_history',
};
