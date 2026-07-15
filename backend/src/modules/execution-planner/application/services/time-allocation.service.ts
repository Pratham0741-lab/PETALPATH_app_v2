import { BalancedGroup } from './session-balancing.service.js';
import { SelectedRecommendation } from './execution-selection.service.js';
import { TimeAllocation } from '../../domain/value-objects/time-allocation.js';

export interface AllocatedItem {
  item: SelectedRecommendation;
  allocatedMinutes: number;
}

export class TimeAllocationService {
  private readonly MIN_TASK_MINUTES = 2;

  allocate(groups: BalancedGroup[], totalAvailableMinutes: number): AllocatedItem[] {
    const result: AllocatedItem[] = [];
    let remainingMinutes = totalAvailableMinutes;

    const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
    let distributedItems = 0;

    for (const group of groups) {
      if (remainingMinutes <= 0) break;

      const desiredPerItem = Math.floor(group.allocatedMinutes / Math.max(1, group.items.length));
      const remainingItems = Math.max(1, totalItems - distributedItems);
      const budgetPerItem = Math.floor(remainingMinutes / remainingItems);
      const perItemMinutes = Math.max(
        this.MIN_TASK_MINUTES,
        Math.min(desiredPerItem, budgetPerItem),
      );

      for (const item of group.items) {
        if (remainingMinutes <= 0) break;

        const allocMinutes = Math.min(perItemMinutes, remainingMinutes);
        result.push({ item, allocatedMinutes: allocMinutes });
        remainingMinutes -= allocMinutes;
        distributedItems++;
      }
    }

    const spillover = remainingMinutes;
    if (spillover > 0 && result.length > 0) {
      const sortedByPriority = [...result].sort(
        (a, b) => b.item.executionPriority.normalizedScore - a.item.executionPriority.normalizedScore,
      );
      const topIdx = result.indexOf(sortedByPriority[0]);
      if (topIdx >= 0) {
        result[topIdx] = {
          ...result[topIdx],
          allocatedMinutes: result[topIdx].allocatedMinutes + spillover,
        };
      }
    }

    return result;
  }
}
