import { DecisionContext } from '../../domain/entities/decision-context.entity.js';
import {
  DifficultyRecommendation,
  DifficultyLevel,
} from '../../domain/value-objects/difficulty-recommendation.js';

const DIFFICULTY_ORDER: DifficultyLevel[] = [
  DifficultyLevel.EASY,
  DifficultyLevel.MEDIUM,
  DifficultyLevel.HARD,
  DifficultyLevel.VERY_HARD,
];

export class DifficultyDecisionService {
  decide(context: DecisionContext): DifficultyRecommendation {
    const state = context.learningState;
    const currentLevel = this.parseDifficulty(state.currentDifficulty);
    const currentIdx = DIFFICULTY_ORDER.indexOf(currentLevel);

    const failureRate = state.totalAttempts > 0
      ? state.incorrectAttempts / state.totalAttempts
      : 0;

    const isStruggling = failureRate > 0.5 || state.retryCount >= 2;
    const masteryLow = state.mastery < 40;
    const masteryHigh = state.mastery >= 85;
    const confidenceLow = state.confidence < 30;
    const confidenceHigh = state.confidence >= 70;

    let recommendedIdx = currentIdx;
    const reasons: string[] = [];

    if (masteryHigh && confidenceHigh && !isStruggling) {
      recommendedIdx = Math.min(currentIdx + 1, DIFFICULTY_ORDER.length - 1);
      reasons.push('High mastery and confidence support harder difficulty');
    } else if (isStruggling || masteryLow || confidenceLow) {
      recommendedIdx = Math.max(currentIdx - 1, 0);
      if (failureRate > 0.7 || state.retryCount >= 3) {
        recommendedIdx = 0;
        reasons.push('Multiple failures and retries require EASY difficulty');
      } else {
        reasons.push('Low performance indicates easier difficulty needed');
      }
    } else {
      reasons.push('Current difficulty is appropriate for current performance');
    }

    const delta = recommendedIdx - currentIdx;
    const confidence = Math.max(0, Math.min(100, 100 - failureRate * 50 - state.retryCount * 10));

    return new DifficultyRecommendation({
      recommendedDifficulty: DIFFICULTY_ORDER[recommendedIdx],
      previousDifficulty: currentLevel,
      delta,
      reason: reasons.join('; ') || 'No adjustment needed',
      confidence: Math.round(confidence),
    });
  }

  private parseDifficulty(difficulty: string): DifficultyLevel {
    const upper = difficulty.toUpperCase();
    if (DIFFICULTY_ORDER.includes(upper as DifficultyLevel)) {
      return upper as DifficultyLevel;
    }
    return DifficultyLevel.MEDIUM;
  }
}
