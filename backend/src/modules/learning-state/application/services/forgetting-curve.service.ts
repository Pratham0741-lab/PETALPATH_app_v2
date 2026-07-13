import { LearningState } from '../../domain/entities/learning-state.entity.js';
import { ForgettingCurveConfig } from '../../domain/value-objects/calculation-config.js';

export interface ForgettingCurveResult {
  retention: number;
  nextReviewIntervalDays: number;
  updatedStability: number;
  updatedForgettingRate: number;
}

export class ForgettingCurveService {
  private readonly config: ForgettingCurveConfig;

  constructor(config?: ForgettingCurveConfig) {
    this.config = config ?? new ForgettingCurveConfig();
  }

  calculateRetention(state: LearningState): number {
    const now = Date.now();
    const lastReview = state.lastReviewedAt?.getTime() ?? state.createdAt.getTime();
    const elapsedDays = Math.max(0, (now - lastReview) / (1000 * 60 * 60 * 24));

    if (state.stability <= 0) return 100;
    const normalizedTime = elapsedDays / state.stability;
    return Math.round(
      100 * Math.exp(-(normalizedTime ** this.config.retentionDecayPower)),
    );
  }

  calculateDecay(state: LearningState, correct: boolean): ForgettingCurveResult {
    const retention = this.calculateRetention(state);

    let newStability: number;
    let newForgettingRate: number;

    if (correct) {
      newStability = Math.min(
        this.config.stabilityMax,
        state.stability + this.config.stabilityIncrementCorrect,
      );
      newForgettingRate = Math.max(
        this.config.minForgettingRate,
        state.forgettingRate * 0.9,
      );
    } else {
      newStability = Math.max(
        this.config.stabilityMin,
        state.stability - this.config.stabilityDecrementIncorrect,
      );
      newForgettingRate = Math.min(
        1.0,
        state.forgettingRate * 1.2,
      );
    }

    const nextInterval = newStability > 0
      ? Math.max(this.config.reviewIntervalMinDays, Math.round(newStability))
      : 0;

    return {
      retention,
      nextReviewIntervalDays: nextInterval,
      updatedStability: Math.round(newStability * 100) / 100,
      updatedForgettingRate: Math.round(newForgettingRate * 1000) / 1000,
    };
  }

  calculateNextReviewDate(state: LearningState): Date | null {
    if (state.reviewIntervalDays <= 0) return null;
    const base = state.lastPracticedAt ?? new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + state.reviewIntervalDays);
    return next;
  }
}
