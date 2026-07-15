import { RecommendationContext } from '../../domain/entities/recommendation-context.entity.js';
import { Recommendation } from '../../domain/entities/recommendation.entity.js';

export class RecommendationExplanationService {
  generate(
    context: RecommendationContext,
    ranked: Recommendation[],
  ): string[] {
    const explanations: string[] = [];
    const decision = context.adaptiveDecision;

    explanations.push(...this.describeContext(context));
    explanations.push(...this.describeTopRecommendation(ranked));
    explanations.push(...this.describeDecisionInfluence(decision));

    return explanations;
  }

  private describeContext(context: RecommendationContext): string[] {
    const msgs: string[] = [];

    if (context.isRecoveryActive) {
      msgs.push('Recovery mode is active. Recommendations favor easier content.');
    }

    const debtCount = context.unresolvedDebts.length;
    if (debtCount > 0) {
      msgs.push(`${debtCount} unresolved learning debt(s) to address.`);
    }

    const dueItems = context.reinforcementItems.filter(r => {
      if (!r.nextReviewAt) return false;
      return new Date() > new Date(r.nextReviewAt);
    });
    if (dueItems.length > 0) {
      msgs.push(`${dueItems.length} reinforcement item(s) are overdue.`);
    }

    return msgs;
  }

  private describeTopRecommendation(ranked: Recommendation[]): string[] {
    if (ranked.length === 0) return ['No recommendations generated.'];

    const top = ranked[0];
    return [
      `Top recommendation: ${top.recommendationType} for topic ${top.topicId} at ${top.difficulty} difficulty.`,
      `Estimated duration: ${top.estimatedDuration.average} minutes.`,
    ];
  }

  private describeDecisionInfluence(decision: any): string[] {
    const msgs: string[] = [];
    const result = decision.result;

    if (result.interventionLevel.level !== 'NONE') {
      msgs.push(`${result.interventionLevel.level} intervention: ${result.interventionLevel.reason}`);
    }

    if (result.difficulty.delta !== 0) {
      const direction = result.difficulty.delta > 0 ? 'increased' : 'decreased';
      msgs.push(`Difficulty ${direction} based on recent performance.`);
    }

    if (result.reviewPriority.isOverdue) {
      msgs.push('Review is overdue based on forgetting curve analysis.');
    }

    return msgs;
  }
}
