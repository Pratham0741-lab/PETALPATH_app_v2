import { OrderedItem } from './execution-ordering.service.js';
import { ItemExplanations } from './execution-explanation.service.js';
import { ExecutionItem } from '../../domain/entities/execution-item.entity.js';
import { ExecutionPlan } from '../../domain/entities/execution-plan.entity.js';
import { ExecutionSummary } from '../../domain/entities/execution-summary.entity.js';
import { ExecutionTrace } from '../../domain/entities/execution-trace.entity.js';
import { RecommendationType } from '../../../recommendation-generation/domain/value-objects/recommendation-type.js';

export class ExecutionPlanBuilder {
  private childId: string = '';
  private orderedItems: OrderedItem[] = [];
  private explanations: ItemExplanations[] = [];
  private traces: ExecutionTrace[] = [];

  withChildId(childId: string): this {
    this.childId = childId;
    return this;
  }

  withOrderedItems(items: OrderedItem[]): this {
    this.orderedItems = items;
    return this;
  }

  withExplanations(explanations: ItemExplanations[]): this {
    this.explanations = explanations;
    return this;
  }

  withTrace(trace: ExecutionTrace): this {
    this.traces.push(trace);
    return this;
  }

  withTraces(traces: ExecutionTrace[]): this {
    this.traces.push(...traces);
    return this;
  }

  build(): ExecutionPlan {
    const items: ExecutionItem[] = this.orderedItems.map((oi, index) => {
      const explanationMap = new Map(
        this.explanations.map(e => [e.itemIndex, e.explanations]),
      );
      const explanations = explanationMap.get(index) ?? [];
      const combined = [...explanations, ...oi.item.item.recommendation.explanation];

      return new ExecutionItem({
        id: `${this.childId}-${oi.order}-${oi.sequence}`,
        recommendation: oi.item.item.recommendation,
        executionPriority: oi.item.item.executionPriority,
        allocatedMinutes: oi.item.allocatedMinutes,
        order: oi.order,
        explanation: combined,
      });
    });

    const totalDuration = items.reduce((sum, i) => sum + i.allocatedMinutes, 0);

    const summary = new ExecutionSummary({
      totalTasks: items.length,
      roadmapCount: items.filter(i => i.recommendation.recommendationType === RecommendationType.ROADMAP).length,
      reviewCount: items.filter(i => i.recommendation.recommendationType === RecommendationType.REVIEW).length,
      reinforcementCount: items.filter(i => i.recommendation.recommendationType === RecommendationType.REINFORCEMENT).length,
      debtCount: items.filter(i => i.recommendation.recommendationType === RecommendationType.DEBT).length,
      recoveryCount: items.filter(i => i.recommendation.recommendationType === RecommendationType.RECOVERY).length,
      estimatedDuration: totalDuration,
      balanceScore: this.computeBalanceScore(items),
    });

    return new ExecutionPlan({
      id: crypto.randomUUID(),
      childId: this.childId,
      items,
      summary,
      totalDuration,
      unusedMinutes: 0,
      traces: this.traces,
    });
  }

  private computeBalanceScore(items: ExecutionItem[]): number {
    if (items.length === 0) return 100;

    const typeCounts = new Map<string, number>();
    for (const item of items) {
      const t = item.recommendation.recommendationType;
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }

    const spread = typeCounts.size;
    const maxSpread = 5;
    return Math.round((spread / maxSpread) * 100);
  }
}
