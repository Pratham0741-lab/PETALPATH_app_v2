import { describe, beforeEach, test, expect } from '@jest/globals';
import { ScoringSystem } from '../engine/ScoringSystem';
import { StarRatingEvaluator } from '../engine/StarRatingEvaluator';
import { ScoringModel } from '../types';

describe('ScoringSystem & StarRatingEvaluator Subsystem', () => {
  let scoringSystem: ScoringSystem;
  let sampleScoringModel: ScoringModel;

  beforeEach(() => {
    scoringSystem = new ScoringSystem();
    sampleScoringModel = {
      type: 'per-item',
      basePointsPerItem: 10,
      maxScore: 100,
      starThresholds: {
        oneStar: 0.4,
        twoStars: 0.7,
        threeStars: 0.9,
      },
    };
  });

  test('should calculate per-item score correctly', () => {
    const result = scoringSystem.calculateScore(10, 8, 2, 15000, sampleScoringModel);

    expect(result.numericScore).toBe(80);
    expect(result.percentageScore).toBe(0.8);
  });

  test('should evaluate star thresholds correctly', () => {
    const thresholds = sampleScoringModel.starThresholds;

    expect(StarRatingEvaluator.evaluateStars(0.95, thresholds)).toBe(3);
    expect(StarRatingEvaluator.evaluateStars(0.75, thresholds)).toBe(2);
    expect(StarRatingEvaluator.evaluateStars(0.5, thresholds)).toBe(1);
    expect(StarRatingEvaluator.evaluateStars(0.2, thresholds)).toBe(0);
  });
});
