import { DecisionContext } from '../../domain/entities/decision-context.entity.js';

export class ConfidenceDecisionService {
  private readonly STREAK_BOOST = 5;
  private readonly STREAK_MAX_BOOST = 30;
  private readonly FAILURE_PENALTY_PER_RETRY = 10;
  private readonly HINT_PENALTY = 8;
  private readonly MAX_PENALTY = 50;

  decide(context: DecisionContext): number {
    const state = context.learningState;

    const streakBoost = Math.min(
      state.streak * this.STREAK_BOOST,
      this.STREAK_MAX_BOOST,
    );

    const retryPenalty = Math.min(
      state.retryCount * this.FAILURE_PENALTY_PER_RETRY,
      this.MAX_PENALTY,
    );

    const hintPenalty = Math.min(
      state.hintUsage * this.HINT_PENALTY,
      this.MAX_PENALTY,
    );

    const failureRate = state.totalAttempts > 0
      ? state.incorrectAttempts / state.totalAttempts
      : 0;
    const failurePenalty = failureRate * 30;

    const totalPenalty = retryPenalty + hintPenalty + failurePenalty;
    const adjustment = streakBoost - totalPenalty;

    return Math.max(-50, Math.min(50, Math.round(adjustment)));
  }
}
