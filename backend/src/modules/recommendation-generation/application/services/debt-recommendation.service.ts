import { RecommendationContext } from '../../domain/entities/recommendation-context.entity.js';
import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RecommendationType } from '../../domain/value-objects/recommendation-type.js';
import { RecommendationPriority } from '../../domain/value-objects/recommendation-priority.js';
import { RecommendationConfidence } from '../../domain/value-objects/recommendation-confidence.js';
import { EstimatedDuration } from '../../domain/value-objects/estimated-duration.js';

export class DebtRecommendationService {
  generate(context: RecommendationContext): Recommendation[] {
    const items: Recommendation[] = [];
    const decision = context.adaptiveDecision;
    const debtPrio = decision.result.debtPriority;

    if (context.unresolvedDebts.length === 0) return items;

    const seenTopics = new Set<string>();

    for (const debt of context.unresolvedDebts) {
      if (debt.resolved) continue;
      if (seenTopics.has(debt.topicId)) continue;
      seenTopics.add(debt.topicId);

      const priority = new RecommendationPriority(
        this.calculatePriority(debt, debtPrio.score),
        1,
      );

      const confidence = new RecommendationConfidence(
        debt.severity >= 0.7 ? 85 : 70,
      );

      const explanations: string[] = [];
      if (debt.severity >= 0.8) {
        explanations.push('Critical unresolved learning debt — requires immediate attention');
      } else if (debt.severity >= 0.6) {
        explanations.push('High-severity learning debt pending resolution');
      } else {
        explanations.push('Moderate learning debt to address');
      }
      explanations.push(`Debt type: ${debt.debtType}`);

      items.push(
        Recommendation.create({
          recommendationType: RecommendationType.DEBT,
          topicId: debt.topicId,
          roadmapItemId: null,
          modality: decision.result.recommendedModality,
          difficulty: decision.result.difficulty.recommendedDifficulty,
          estimatedDuration: new EstimatedDuration(5, 15),
          priority,
          confidence,
          explanation: explanations,
          prerequisitesSatisfied: true,
          recoveryAware: false,
          reinforcementAware: false,
          source: 'debt',
        }),
      );
    }

    return items;
  }

  private calculatePriority(
    debt: { severity: number; debtType: string },
    decisionDebtScore: number,
  ): number {
    let score = debt.severity * 100;

    if (debt.debtType === 'PRACTICE') score += 10;
    if (debt.debtType === 'REVIEW') score += 5;

    score = score * 0.7 + decisionDebtScore * 0.3;
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
