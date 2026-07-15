import { RecommendationContext } from '../../domain/entities/recommendation-context.entity.js';
import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RecommendationType } from '../../domain/value-objects/recommendation-type.js';
import { RecommendationPriority } from '../../domain/value-objects/recommendation-priority.js';
import { RecommendationConfidence } from '../../domain/value-objects/recommendation-confidence.js';
import { EstimatedDuration } from '../../domain/value-objects/estimated-duration.js';

export class ReinforcementRecommendationService {
  generate(context: RecommendationContext): Recommendation[] {
    const items: Recommendation[] = [];
    const decision = context.adaptiveDecision;
    const reinforcementPrio = decision.result.reinforcementPriority;

    if (reinforcementPrio.score < 20) return items;

    const seenTopics = new Set<string>();

    for (const queueItem of context.reinforcementItems) {
      if (queueItem.status !== 'ACTIVE') continue;
      if (seenTopics.has(queueItem.topicId)) continue;
      seenTopics.add(queueItem.topicId);

      const isOverdue = queueItem.nextReviewAt
        ? new Date() > new Date(queueItem.nextReviewAt)
        : false;

      const baseScore = this.calculateBaseScore(queueItem, isOverdue);
      const priority = new RecommendationPriority(
        Math.min(100, baseScore + reinforcementPrio.score * 0.3),
        1,
      );

      const confidence = new RecommendationConfidence(
        isOverdue ? 60 : 80,
      );

      const explanations: string[] = [];
      if (isOverdue) {
        explanations.push('Reinforcement review is overdue');
      }
      if (reinforcementPrio.score >= 50) {
        explanations.push('Reinforcement needed based on mastery and confidence');
      }
      if (queueItem.priority > 50) {
        explanations.push('High priority reinforcement queue item');
      }
      explanations.push('Scheduled reinforcement review to maintain retention');

      items.push(
        Recommendation.create({
          recommendationType: RecommendationType.REINFORCEMENT,
          topicId: queueItem.topicId,
          roadmapItemId: null,
          modality: decision.result.recommendedModality,
          difficulty: decision.result.difficulty.recommendedDifficulty,
          estimatedDuration: new EstimatedDuration(5, 10),
          priority,
          confidence,
          explanation: explanations,
          prerequisitesSatisfied: true,
          recoveryAware: false,
          reinforcementAware: true,
          source: 'reinforcement',
        }),
      );
    }

    if (items.length === 0 && reinforcementPrio.score >= 40 && context.reinforcementItems.length === 0) {
      const priority = new RecommendationPriority(
        Math.round(reinforcementPrio.score),
        1,
      );

      items.push(
        Recommendation.create({
          recommendationType: RecommendationType.REINFORCEMENT,
          topicId: context.topicId,
          roadmapItemId: null,
          modality: decision.result.recommendedModality,
          difficulty: decision.result.difficulty.recommendedDifficulty,
          estimatedDuration: new EstimatedDuration(5, 10),
          priority,
          confidence: new RecommendationConfidence(70),
          explanation: [
            'General reinforcement recommended to maintain mastery',
          ],
          prerequisitesSatisfied: true,
          recoveryAware: false,
          reinforcementAware: true,
          source: 'reinforcement',
        }),
      );
    }

    return items;
  }

  private calculateBaseScore(
    queueItem: { priority: number; nextReviewAt: Date | null },
    isOverdue: boolean,
  ): number {
    let score = queueItem.priority;
    if (isOverdue) score += 20;
    return score;
  }
}
