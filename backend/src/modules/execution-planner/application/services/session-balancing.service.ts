import { SelectedRecommendation } from './execution-selection.service.js';
import { ExecutionContext } from '../../domain/entities/execution-context.entity.js';
import { RecommendationType } from '../../../recommendation-generation/domain/value-objects/recommendation-type.js';

export interface BalancedGroup {
  type: string;
  items: SelectedRecommendation[];
  targetMinutes: number;
  allocatedMinutes: number;
  ratio: number;
}

export class SessionBalancingService {
  balance(
    candidates: SelectedRecommendation[],
    context: ExecutionContext,
  ): BalancedGroup[] {
    const groups = this.groupByType(candidates);
    const availableMinutes = context.availableMinutes;

    const ratioGroups = [
      { type: 'roadmap', recTypes: [RecommendationType.ROADMAP], ratio: context.balance.roadmapRatio },
      { type: 'review', recTypes: [RecommendationType.REVIEW], ratio: context.balance.reviewRatio },
      { type: 'reinforcement', recTypes: [RecommendationType.REINFORCEMENT], ratio: context.balance.reinforcementRatio },
      { type: 'debt', recTypes: [RecommendationType.DEBT], ratio: context.balance.debtRatio },
      { type: 'recovery', recTypes: [RecommendationType.RECOVERY], ratio: context.balance.recoveryRatio },
    ];

    const availableRatio = ratioGroups
      .filter(rg => groups[rg.type] && groups[rg.type].length > 0)
      .reduce((sum, rg) => sum + rg.ratio, 0);

    const balanced: BalancedGroup[] = [];
    const totalAvailableRatio = Math.max(1, availableRatio);

    for (const rg of ratioGroups) {
      const items = groups[rg.type] ?? [];
      if (items.length === 0) continue;

      const proportionateRatio = rg.ratio / totalAvailableRatio;
      const targetMinutes = Math.round(availableMinutes * proportionateRatio);
      const allocatedMinutes = Math.max(
        1,
        Math.min(targetMinutes, items.length * 10),
      );

      balanced.push({
        type: rg.type,
        items,
        targetMinutes,
        allocatedMinutes,
        ratio: rg.ratio,
      });
    }

    return balanced;
  }

  private groupByType(
    candidates: SelectedRecommendation[],
  ): Record<string, SelectedRecommendation[]> {
    const groups: Record<string, SelectedRecommendation[]> = {};

    for (const c of candidates) {
      const type = c.recommendation.recommendationType.toLowerCase();
      if (!groups[type]) groups[type] = [];
      groups[type].push(c);
    }

    return groups;
  }
}
