import { RecommendationContext } from '../../domain/entities/recommendation-context.entity.js';
import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RecommendationType } from '../../domain/value-objects/recommendation-type.js';
import { RecommendationPriority } from '../../domain/value-objects/recommendation-priority.js';
import { RecommendationConfidence } from '../../domain/value-objects/recommendation-confidence.js';
import { EstimatedDuration } from '../../domain/value-objects/estimated-duration.js';

export class ReviewRecommendationService {
  generate(context: RecommendationContext): Recommendation[] {
    const items: Recommendation[] = [];
    const decision = context.adaptiveDecision;
    const review = decision.result.reviewPriority;

    if (review.priority < 20) return items;

    const priority = new RecommendationPriority(review.priority, 1);

    const confidence = new RecommendationConfidence(
      Math.round((100 - review.priority + review.retentionProbability) / 2),
    );

    const duration = new EstimatedDuration(5, 10);

    const explanations: string[] = [];

    if (review.isOverdue) {
      explanations.push('Review is overdue based on forgetting curve');
    }
    if (review.retentionProbability < 50) {
      explanations.push('Retention probability is critically low');
    }
    if (review.priority >= 70) {
      explanations.push('High forgetting probability requires immediate review');
    } else if (review.priority >= 40) {
      explanations.push('Moderate review urgency based on forgetting curve');
    }

    if (explanations.length === 0) {
      explanations.push('Scheduled review due based on spacing interval');
    }

    items.push(
      Recommendation.create({
        recommendationType: RecommendationType.REVIEW,
        topicId: context.topicId,
        roadmapItemId: null,
        modality: decision.result.recommendedModality,
        difficulty: decision.result.difficulty.recommendedDifficulty,
        estimatedDuration: duration,
        priority,
        confidence,
        explanation: explanations,
        prerequisitesSatisfied: true,
        recoveryAware: false,
        reinforcementAware: false,
        source: 'review',
      }),
    );

    return items;
  }
}
