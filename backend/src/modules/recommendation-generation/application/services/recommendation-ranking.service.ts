import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RecommendationContext } from '../../domain/entities/recommendation-context.entity.js';
import { OrderingReason } from '../../domain/value-objects/ordering-reason.js';
import { RECOMMENDATION_TYPE_WEIGHTS } from '../../../../shared/recommendation-weights.js';

interface RankedCandidate {
  recommendation: Recommendation;
  finalScore: number;
  reasons: OrderingReason[];
}

export class RecommendationRankingService {
  private readonly TYPE_WEIGHTS = RECOMMENDATION_TYPE_WEIGHTS;

  rank(
    candidates: Recommendation[],
    context: RecommendationContext,
  ): Recommendation[] {
    const ranked: RankedCandidate[] = candidates.map(c => {
      const reasons: OrderingReason[] = [];
      let score = c.priority.weightedScore;

      const typeWeight = this.TYPE_WEIGHTS[c.recommendationType] ?? 1.0;
      if (typeWeight !== 1.0) {
        score *= typeWeight;
        reasons.push(new OrderingReason(
          'type_weight',
          `${c.recommendationType} type weight ${typeWeight}`,
        ));
      }

      if (c.recoveryAware) {
        score *= 1.3;
        reasons.push(new OrderingReason(
          'recovery_aware',
          'Recovery-aware recommendation boosted',
        ));
      }

      if (c.confidence.score >= 80) {
        score *= 1.1;
        reasons.push(new OrderingReason(
          'high_confidence',
          'High confidence recommendation boosted',
        ));
      }

      if (c.prerequisitesSatisfied) {
        reasons.push(new OrderingReason(
          'prerequisites_met',
          'Prerequisites satisfied',
        ));
      }

      score = Math.max(0, Math.min(200, Math.round(score)));

      return { recommendation: c, finalScore: score, reasons };
    });

    ranked.sort((a, b) => b.finalScore - a.finalScore);

    return ranked.map(r => r.recommendation);
  }
}
