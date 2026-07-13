import { engineConfig } from '../../../../shared/config/engine.config.js';

export class MasteryConfig {
  readonly correctBaseIncrement: number;
  readonly incorrectBaseDecrement: number;
  readonly diminishingReturnsThreshold: number;
  readonly penaltyAccelerationThreshold: number;
  readonly minValue: number;
  readonly maxValue: number;

  constructor() {
    const c = engineConfig.learningState.mastery;
    this.correctBaseIncrement = c.correctBaseIncrement;
    this.incorrectBaseDecrement = c.incorrectBaseDecrement;
    this.diminishingReturnsThreshold = c.diminishingReturnsThreshold;
    this.penaltyAccelerationThreshold = c.penaltyAccelerationThreshold;
    this.minValue = c.minValue;
    this.maxValue = c.maxValue;
  }
}

export class ConfidenceConfig {
  readonly baseConfidencePerStreak: number;
  readonly retryPenalty: number;
  readonly hintPenalty: number;
  readonly consistencyWindow: number;
  readonly recentPerformanceWeight: number;
  readonly maxConfidence: number;

  constructor() {
    const c = engineConfig.learningState.confidence;
    this.baseConfidencePerStreak = c.baseConfidencePerStreak;
    this.retryPenalty = c.retryPenalty;
    this.hintPenalty = c.hintPenalty;
    this.consistencyWindow = c.consistencyWindow;
    this.recentPerformanceWeight = c.recentPerformanceWeight;
    this.maxConfidence = c.maxConfidence;
  }
}

export class ForgettingCurveConfig {
  readonly initialStability: number;
  readonly stabilityIncrementCorrect: number;
  readonly stabilityDecrementIncorrect: number;
  readonly stabilityMin: number;
  readonly stabilityMax: number;
  readonly baseForgettingRate: number;
  readonly minForgettingRate: number;
  readonly reviewIntervalMinDays: number;
  readonly retentionDecayPower: number;

  constructor() {
    const c = engineConfig.learningState.forgettingCurve;
    this.initialStability = c.initialStability;
    this.stabilityIncrementCorrect = c.stabilityIncrementCorrect;
    this.stabilityDecrementIncorrect = c.stabilityDecrementIncorrect;
    this.stabilityMin = c.stabilityMin;
    this.stabilityMax = c.stabilityMax;
    this.baseForgettingRate = c.baseForgettingRate;
    this.minForgettingRate = c.minForgettingRate;
    this.reviewIntervalMinDays = c.reviewIntervalMinDays;
    this.retentionDecayPower = c.retentionDecayPower;
  }
}
