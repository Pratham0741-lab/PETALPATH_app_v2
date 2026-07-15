import { Recommendation } from '../../../recommendation-generation/domain/entities/recommendation.entity.js';
import { ExecutionContext } from '../../domain/entities/execution-context.entity.js';
import { ExecutionPriority } from '../../domain/value-objects/execution-priority.js';
import { RecommendationType } from '../../../recommendation-generation/domain/value-objects/recommendation-type.js';
import { RECOMMENDATION_TYPE_WEIGHTS } from '../../../../shared/recommendation-weights.js';

export interface SelectedRecommendation {
  recommendation: Recommendation;
  executionPriority: ExecutionPriority;
}

export class ExecutionSelectionService {
  private readonly MAX_RECOMMENDATIONS = 10;

  select(context: ExecutionContext): SelectedRecommendation[] {
    const recs = context.recommendationSet.recommendations;
    const selected: SelectedRecommendation[] = [];
    const seenTopics = new Set<string>();

    const phaseOrder: Record<string, number> = {
      [RecommendationType.RECOVERY]: 0,
      [RecommendationType.REVIEW]: 1,
      [RecommendationType.DEBT]: 2,
      [RecommendationType.REINFORCEMENT]: 3,
      [RecommendationType.ROADMAP]: 4,
    };

    const sorted = [...recs].sort((a, b) => {
      const phaseA = phaseOrder[a.recommendationType] ?? 99;
      const phaseB = phaseOrder[b.recommendationType] ?? 99;
      if (phaseA !== phaseB) return phaseA - phaseB;
      return b.priority.weightedScore - a.priority.weightedScore;
    });

    for (const rec of sorted) {
      if (selected.length >= this.MAX_RECOMMENDATIONS) break;
      if (seenTopics.has(rec.topicId)) continue;
      seenTopics.add(rec.topicId);

      const executionPriority = this.computeExecutionPriority(rec, context);
      selected.push({ recommendation: rec, executionPriority });
    }

    return selected;
  }

  private computeExecutionPriority(
    rec: Recommendation,
    context: ExecutionContext,
  ): ExecutionPriority {
    let score = rec.priority.weightedScore;

    if (context.adaptiveDecision.result.interventionLevel.level !== 'NONE') {
      score *= 1.2;
    }

    if (rec.recoveryAware) score *= 1.3;

    const typeWeight = rec.recoveryAware
      ? RECOMMENDATION_TYPE_WEIGHTS[RecommendationType.RECOVERY]
      : RECOMMENDATION_TYPE_WEIGHTS[rec.recommendationType] ?? 1.0;
    score *= typeWeight;

    return new ExecutionPriority(
      Math.round(Math.max(0, Math.min(100, score))),
    );
  }
}
