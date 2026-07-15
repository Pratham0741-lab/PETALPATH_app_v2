import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RecommendationSet } from '../../domain/entities/recommendation-set.entity.js';
import { RecommendationSummary } from '../../domain/entities/recommendation-summary.entity.js';
import { RecommendationTrace } from '../../domain/entities/recommendation-trace.entity.js';
import { RecommendationContext } from '../../domain/entities/recommendation-context.entity.js';
import { RecommendationType } from '../../domain/value-objects/recommendation-type.js';

export class RecommendationBuilder {
  private context!: RecommendationContext;
  private recommendations: Recommendation[] = [];
  private traces: RecommendationTrace[] = [];

  withContext(context: RecommendationContext): this {
    this.context = context;
    return this;
  }

  withRecommendations(recs: Recommendation[]): this {
    this.recommendations = recs;
    return this;
  }

  withTrace(trace: RecommendationTrace): this {
    this.traces.push(trace);
    return this;
  }

  withTraces(traces: RecommendationTrace[]): this {
    this.traces.push(...traces);
    return this;
  }

  build(): RecommendationSet {
    const summary = this.buildSummary();

    return new RecommendationSet({
      id: crypto.randomUUID(),
      childId: this.context.childId,
      topicId: this.context.topicId,
      recommendations: this.recommendations,
      summary,
      evaluatedAt: new Date(),
      traces: this.traces,
    });
  }

  private buildSummary(): RecommendationSummary {
    const total = this.recommendations.length;

    if (total === 0) {
      return new RecommendationSummary({
        totalRecommendations: 0,
        topPriority: 0,
        topType: 'none',
        primarySource: 'none',
        hasRecoveryRecommendations: false,
        hasUrgentRecommendations: false,
      });
    }

    const top = this.recommendations[0];
    const typeCounts = new Map<string, number>();
    for (const r of this.recommendations) {
      typeCounts.set(
        r.recommendationType,
        (typeCounts.get(r.recommendationType) ?? 0) + 1,
      );
    }
    const topType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const sourceCounts = new Map<string, number>();
    for (const r of this.recommendations) {
      sourceCounts.set(
        r.source,
        (sourceCounts.get(r.source) ?? 0) + 1,
      );
    }
    const primarySource = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0][0];

    return new RecommendationSummary({
      totalRecommendations: total,
      topPriority: Math.round(top.priority.weightedScore),
      topType,
      primarySource,
      hasRecoveryRecommendations:
        this.recommendations.some(r => r.recommendationType === RecommendationType.RECOVERY),
      hasUrgentRecommendations:
        this.recommendations.some(r => r.priority.weightedScore >= 70),
    });
  }
}
