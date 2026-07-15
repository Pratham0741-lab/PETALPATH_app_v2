import { RecommendationContext, RoadmapSection } from '../../domain/entities/recommendation-context.entity.js';
import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RecommendationType } from '../../domain/value-objects/recommendation-type.js';
import { RecommendationPriority } from '../../domain/value-objects/recommendation-priority.js';
import { RecommendationConfidence } from '../../domain/value-objects/recommendation-confidence.js';
import { EstimatedDuration } from '../../domain/value-objects/estimated-duration.js';

export class RoadmapRecommendationService {
  generate(context: RecommendationContext): Recommendation[] {
    const items: Recommendation[] = [];

    const roadmapItems = context.roadmapSections.filter(
      s => s.topicId !== null && s.sectionType !== 'REWARD',
    );

    const decision = context.adaptiveDecision;

    for (const item of roadmapItems) {
      const priority = new RecommendationPriority(
        this.calculatePriority(item, decision),
        1,
      );

      const confidence = new RecommendationConfidence(
        this.calculateConfidence(item, decision),
      );

      const duration = new EstimatedDuration(
        Math.max(2, item.estimatedMinutes - 2),
        item.estimatedMinutes + 3,
      );

      const explanations: string[] = [];
      if (item.sectionType === 'NEW_LEARNING') {
        explanations.push('New learning topic from curriculum roadmap');
      } else if (item.sectionType === 'DAILY_PRACTICE') {
        explanations.push('Daily practice item from roadmap schedule');
      } else if (item.sectionType === 'MASTERY_PRACTICE') {
        explanations.push('Mastery practice to reinforce learning');
      } else if (item.sectionType === 'RECOVERY') {
        explanations.push('Recovery item from roadmap');
      }

      items.push(
        Recommendation.create({
          recommendationType: RecommendationType.ROADMAP,
          topicId: item.topicId!,
          roadmapItemId: `${item.sectionType}-${item.topicId}-${item.order}`,
          modality: item.modality,
          difficulty: decision.result.difficulty.recommendedDifficulty,
          estimatedDuration: duration,
          priority,
          confidence,
          explanation: explanations,
          prerequisitesSatisfied: true,
          recoveryAware: item.sectionType === 'RECOVERY',
          reinforcementAware: item.metadata?.reinforcement === true,
          source: 'roadmap',
        }),
      );
    }

    return items;
  }

  private calculatePriority(
    item: RoadmapSection,
    decision: any,
  ): number {
    let score = item.priority;

    if (item.sectionType === 'RECOVERY') score += 30;
    if (item.sectionType === 'DAILY_PRACTICE') score += 10;
    if (item.sectionType === 'MASTERY_PRACTICE') score += 20;

    const masteryPrio = decision.result.masteryPriority.score;
    if (masteryPrio > 50) score += 15;

    score = Math.max(0, Math.min(100, score));
    return score;
  }

  private calculateConfidence(
    item: RoadmapSection,
    decision: any,
  ): number {
    const base = 70;
    const difficultyConfidence = decision.result.difficulty.confidence;
    return Math.round((base + difficultyConfidence) / 2);
  }
}
