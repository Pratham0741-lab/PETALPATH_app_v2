import { SelectedRecommendation } from './execution-selection.service.js';
import { ExecutionContext } from '../../domain/entities/execution-context.entity.js';

export class ConflictResolutionService {
  private readonly DIFFICULTY_ORDER = ['EASY', 'MEDIUM', 'HARD', 'VERY_HARD'];

  resolve(
    candidates: SelectedRecommendation[],
    context: ExecutionContext,
  ): SelectedRecommendation[] {
    let resolved = [...candidates];

    resolved = this.removeDuplicateTopics(resolved);
    resolved = this.applyDifficultyConstraint(resolved, context);
    resolved = this.applyRecoveryConstraint(resolved, context);

    return resolved;
  }

  private removeDuplicateTopics(
    candidates: SelectedRecommendation[],
  ): SelectedRecommendation[] {
    const seenTopics = new Map<string, SelectedRecommendation>();

    for (const c of candidates) {
      const existing = seenTopics.get(c.recommendation.topicId);
      if (!existing) {
        seenTopics.set(c.recommendation.topicId, c);
      } else if (
        c.executionPriority.normalizedScore >
        existing.executionPriority.normalizedScore
      ) {
        seenTopics.set(c.recommendation.topicId, c);
      }
    }

    return [...seenTopics.values()];
  }

  private applyDifficultyConstraint(
    candidates: SelectedRecommendation[],
    context: ExecutionContext,
  ): SelectedRecommendation[] {
    const maxDifficulty = context.constraints.maxDifficultyLevel;
    const maxIdx = this.DIFFICULTY_ORDER.indexOf(maxDifficulty);

    return candidates.filter(c => {
      const cIdx = this.DIFFICULTY_ORDER.indexOf(c.recommendation.difficulty);
      if (cIdx > maxIdx) return false;
      return true;
    });
  }

  private applyRecoveryConstraint(
    candidates: SelectedRecommendation[],
    context: ExecutionContext,
  ): SelectedRecommendation[] {
    const isRecovery =
      context.adaptiveDecision.result.interventionLevel.level === 'CRITICAL' ||
      context.adaptiveDecision.result.interventionLevel.level === 'HIGH';

    if (!isRecovery) return candidates;

    return candidates.filter(c => {
      if (c.recommendation.recoveryAware) return true;
      const cIdx = this.DIFFICULTY_ORDER.indexOf(c.recommendation.difficulty);
      return cIdx < 2;
    });
  }
}
