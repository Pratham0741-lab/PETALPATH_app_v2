import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RecommendationContext } from '../../domain/entities/recommendation-context.entity.js';
import { RecommendationType } from '../../domain/value-objects/recommendation-type.js';

export class RecommendationFilteringService {
  private readonly DIFFICULTY_ORDER = [
    'EASY', 'MEDIUM', 'HARD', 'VERY_HARD',
  ];

  filter(
    candidates: Recommendation[],
    context: RecommendationContext,
  ): Recommendation[] {
    let filtered = [...candidates];

    filtered = this.removeDuplicates(filtered);
    filtered = this.applyConstraints(filtered, context);
    filtered = this.applyRecoveryRules(filtered, context);

    return filtered;
  }

  private removeDuplicates(candidates: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const key = `${c.recommendationType}:${c.topicId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private applyConstraints(
    candidates: Recommendation[],
    context: RecommendationContext,
  ): Recommendation[] {
    const maxDifficulty = context.constraints.maxDifficultyLevel;
    const maxIdx = this.DIFFICULTY_ORDER.indexOf(maxDifficulty);

    return candidates.filter(c => {
      const cIdx = this.DIFFICULTY_ORDER.indexOf(c.difficulty);
      if (cIdx > maxIdx) return false;
      return true;
    });
  }

  private applyRecoveryRules(
    candidates: Recommendation[],
    context: RecommendationContext,
  ): Recommendation[] {
    if (!context.isRecoveryActive) return candidates;

    const nonRecoveryHard = candidates.filter(c => {
      if (c.recommendationType === RecommendationType.RECOVERY) return false;
      const cIdx = this.DIFFICULTY_ORDER.indexOf(c.difficulty);
      return cIdx >= 2;
    });

    if (nonRecoveryHard.length > 0) {
      return candidates.filter(c => {
        if (c.recommendationType === RecommendationType.RECOVERY) return true;
        const cIdx = this.DIFFICULTY_ORDER.indexOf(c.difficulty);
        return cIdx < 2;
      });
    }

    return candidates;
  }
}
