export type QualityState = 'good' | 'acceptable' | 'poor';

export const QUALITY_CONFIG = {
  HYSTERESIS_WINDOW_FRAMES: 5, // 5-frame stabilization window to eliminate flickering
  THRESHOLDS: {
    GOOD: {
      MIN_VISIBILITY: 0.85,
      MIN_CONFIDENCE: 0.8,
      MAX_DROPOUTS: 0,
    },
    ACCEPTABLE: {
      MIN_VISIBILITY: 0.65,
      MIN_CONFIDENCE: 0.6,
      MAX_DROPOUTS: 2,
    },
  },
};
