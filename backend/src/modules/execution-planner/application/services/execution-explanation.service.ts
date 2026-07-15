import { OrderedItem } from './execution-ordering.service.js';
import { ExecutionContext } from '../../domain/entities/execution-context.entity.js';
import { ExecutionOrderPhase } from '../../domain/value-objects/execution-order.js';

export interface ItemExplanations {
  itemIndex: number;
  explanations: string[];
}

export class ExecutionExplanationService {
  generate(
    orderedItems: OrderedItem[],
    context: ExecutionContext,
  ): ItemExplanations[] {
    return orderedItems.map((oi, index) => ({
      itemIndex: index,
      explanations: this.explainItem(oi, context),
    }));
  }

  private explainItem(
    oi: OrderedItem,
    context: ExecutionContext,
  ): string[] {
    const msgs: string[] = [];
    const rec = oi.item.item.recommendation;
    const decision = context.adaptiveDecision.result;

    const phaseExplanations: Record<string, string> = {
      [ExecutionOrderPhase.REVIEW]: 'Review scheduled because retention may have decreased.',
      [ExecutionOrderPhase.REINFORCEMENT]: 'Reinforcement needed to strengthen long-term retention.',
      [ExecutionOrderPhase.NEW_LEARNING]: 'New learning topic selected based on curriculum priority.',
      [ExecutionOrderPhase.PRACTICE]: 'Practice activity to apply and consolidate knowledge.',
      [ExecutionOrderPhase.RECOVERY]: 'Recovery prioritized because Recovery Mode is active.',
    };
    const phaseMsg = phaseExplanations[oi.order];
    if (phaseMsg) msgs.push(phaseMsg);

    if (rec.recoveryAware) {
      msgs.push('Recovery-aware task adjusted for current recovery mode.');
    }
    if (rec.reinforcementAware) {
      msgs.push('Reinforcement-aware task supports long-term retention.');
    }
    if (decision.interventionLevel.level !== 'NONE') {
      msgs.push(`${decision.interventionLevel.level} intervention: ${decision.interventionLevel.reason}`);
    }
    if (decision.reviewPriority.isOverdue) {
      msgs.push('Review is overdue based on forgetting curve analysis.');
    }

    if (oi.item.allocatedMinutes > 0) {
      msgs.push(`Allocated ${oi.item.allocatedMinutes} minute(s) for this task.`);
    }

    return msgs;
  }
}
