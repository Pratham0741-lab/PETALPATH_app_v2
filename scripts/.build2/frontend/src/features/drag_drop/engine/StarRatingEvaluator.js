"use strict";
/**
 * Star Rating Evaluator — PetalPath Presentation Layer
 * Evaluates star ratings based on percentage score and star thresholds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarRatingEvaluator = void 0;
class StarRatingEvaluator {
    static evaluateStars(percentageScore, thresholds) {
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
exports.StarRatingEvaluator = StarRatingEvaluator;
