import { AllocatedItem } from './time-allocation.service.js';
import { RecommendationType } from '../../../recommendation-generation/domain/value-objects/recommendation-type.js';
import { ExecutionOrderPhase } from '../../domain/value-objects/execution-order.js';

export interface OrderedItem {
  item: AllocatedItem;
  order: ExecutionOrderPhase;
  sequence: number;
}

export class ExecutionOrderingService {
  order(items: AllocatedItem[]): OrderedItem[] {
    const phaseGroups = new Map<ExecutionOrderPhase, AllocatedItem[]>();

    for (const ai of items) {
      const phase = this.toPhase(ai.item.recommendation.recommendationType);
      if (!phaseGroups.has(phase)) phaseGroups.set(phase, []);
      phaseGroups.get(phase)!.push(ai);
    }

    const ordered: OrderedItem[] = [];
    let sequence = 0;

    const phases = [
      ExecutionOrderPhase.WARMUP,
      ExecutionOrderPhase.REVIEW,
      ExecutionOrderPhase.REINFORCEMENT,
      ExecutionOrderPhase.NEW_LEARNING,
      ExecutionOrderPhase.PRACTICE,
      ExecutionOrderPhase.RECOVERY,
      ExecutionOrderPhase.REFLECTION,
    ];

    for (const phase of phases) {
      const group = phaseGroups.get(phase);
      if (!group || group.length === 0) continue;

      group.sort(
        (a, b) => b.item.executionPriority.normalizedScore - a.item.executionPriority.normalizedScore,
      );

      for (const ai of group) {
        ordered.push({
          item: ai,
          order: phase,
          sequence: sequence++,
        });
      }
    }

    return ordered;
  }

  private toPhase(recType: string): ExecutionOrderPhase {
    switch (recType) {
      case RecommendationType.REVIEW:
        return ExecutionOrderPhase.REVIEW;
      case RecommendationType.REINFORCEMENT:
        return ExecutionOrderPhase.REINFORCEMENT;
      case RecommendationType.DEBT:
        return ExecutionOrderPhase.PRACTICE;
      case RecommendationType.RECOVERY:
        return ExecutionOrderPhase.RECOVERY;
      case RecommendationType.ROADMAP:
        return ExecutionOrderPhase.NEW_LEARNING;
      default:
        return ExecutionOrderPhase.PRACTICE;
    }
  }
}
