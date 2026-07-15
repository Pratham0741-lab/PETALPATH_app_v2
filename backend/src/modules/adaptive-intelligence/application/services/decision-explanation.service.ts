import { DecisionContext } from '../../domain/entities/decision-context.entity.js';
import { DifficultyRecommendation } from '../../domain/value-objects/difficulty-recommendation.js';
import { ReviewPriority } from '../../domain/value-objects/review-priority.js';
import { PriorityScore } from '../../domain/value-objects/priority-score.js';
import { InterventionLevel } from '../../domain/value-objects/intervention-level.js';

export class DecisionExplanationService {
  generate(
    context: DecisionContext,
    difficulty: DifficultyRecommendation,
    review: ReviewPriority,
    reinforcement: PriorityScore,
    debt: PriorityScore,
    intervention: InterventionLevel,
    confidenceAdjustment: number,
  ): string[] {
    const explanations: string[] = [];

    explanations.push(...this.explainMastery(context));
    explanations.push(...this.explainDifficulty(difficulty));
    explanations.push(...this.explainReview(review));
    explanations.push(...this.explainConfidence(context, confidenceAdjustment));
    explanations.push(...this.explainReinforcement(reinforcement));
    explanations.push(...this.explainDebt(debt));
    explanations.push(...this.explainIntervention(intervention));

    return explanations;
  }

  private explainMastery(context: DecisionContext): string[] {
    const state = context.learningState;
    const msgs: string[] = [];

    if (state.mastery >= 85) {
      msgs.push(`Mastery at ${state.mastery}% — above strong threshold.`);
    } else if (state.mastery >= 60) {
      msgs.push(`Mastery at ${state.mastery}% — approaching strong threshold.`);
    } else if (state.mastery >= 40) {
      msgs.push(`Mastery at ${state.mastery}% — moderate, needs improvement.`);
    } else {
      msgs.push(`Mastery at ${state.mastery}% — low, requires focused practice.`);
    }

    return msgs;
  }

  private explainDifficulty(difficulty: DifficultyRecommendation): string[] {
    if (difficulty.delta === 0) {
      return [`Difficulty unchanged at ${difficulty.recommendedDifficulty}. ${difficulty.reason}`];
    }
    if (difficulty.delta > 0) {
      return [`Increasing difficulty from ${difficulty.previousDifficulty} to ${difficulty.recommendedDifficulty}. ${difficulty.reason}`];
    }
    return [`Decreasing difficulty from ${difficulty.previousDifficulty} to ${difficulty.recommendedDifficulty}. ${difficulty.reason}`];
  }

  private explainReview(review: ReviewPriority): string[] {
    if (review.priority >= 70) {
      return [`High review priority (${review.priority}/100). ${review.reason}`];
    }
    if (review.priority >= 40) {
      return [`Moderate review priority (${review.priority}/100). ${review.reason}`];
    }
    return [`Low review priority (${review.priority}/100). ${review.reason}`];
  }

  private explainConfidence(context: DecisionContext, adjustment: number): string[] {
    const msgs: string[] = [];
    const state = context.learningState;

    if (adjustment > 10) {
      msgs.push(`Confidence improving (${adjustment > 0 ? '+' : ''}${adjustment}). Recent streak of ${state.streak} successes.`);
    } else if (adjustment < -10) {
      msgs.push(`Confidence dropping (${adjustment}). Multiple attempts needed.`);
    } else {
      msgs.push(`Confidence stable (${adjustment > 0 ? '+' : ''}${adjustment}).`);
    }

    if (state.hintUsage > 0) {
      msgs.push(`Hint used ${state.hintUsage} time(s) in recent attempts.`);
    }

    return msgs;
  }

  private explainReinforcement(reinforcement: PriorityScore): string[] {
    if (reinforcement.score >= 60) {
      return [`High reinforcement priority (${reinforcement.score}/100). Review sessions recommended.`];
    }
    if (reinforcement.score >= 30) {
      return [`Moderate reinforcement priority (${reinforcement.score}/100). Monitor retention.`];
    }
    return [`Low reinforcement priority (${reinforcement.score}/100). Retention looks stable.`];
  }

  private explainDebt(debt: PriorityScore): string[] {
    if (debt.score >= 50) {
      return [`Debt priority high (${debt.score}/100). Multiple unresolved debts require attention.`];
    }
    if (debt.score >= 20) {
      return [`Debt priority moderate (${debt.score}/100). Some debts to address.`];
    }
    return [`Debt priority low (${debt.score}/100). No significant debt.`];
  }

  private explainIntervention(intervention: InterventionLevel): string[] {
    switch (intervention.level) {
      case 'CRITICAL':
        return [`Critical intervention required. ${intervention.reason}. Immediate attention needed.`];
      case 'HIGH':
        return [`High intervention level. ${intervention.reason}. Consider adjusting session plan.`];
      case 'MEDIUM':
        return [`Medium intervention level. ${intervention.reason}. Monitor closely.`];
      case 'LOW':
        return [`Low intervention level. ${intervention.reason}. Minor adjustments may help.`];
      default:
        return [`No intervention needed. Performance is on track.`];
    }
  }
}
