/**
 * Star Rating Evaluator — PetalPath Presentation Layer
 * Evaluates star ratings based on percentage score and star thresholds.
 */

import { StarThresholds } from '../types';

export class StarRatingEvaluator {
  static evaluateStars(percentageScore: number, thresholds: StarThresholds): number {
    if (percentageScore >= thresholds.threeStars) {
      return 3;
    }
    if (percentageScore >= thresholds.twoStars) {
      return 2;
    }
    if (percentageScore >= thresholds.oneStar) {
      return 1;
    }
    return 0;
  }
}
