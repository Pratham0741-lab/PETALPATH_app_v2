import { Recommendation } from '../../../recommendation-generation/domain/entities/recommendation.entity.js';
import { ExecutionPriority } from '../value-objects/execution-priority.js';
import { ExecutionOrderPhase } from '../value-objects/execution-order.js';

export interface ExecutionItemProps {
  id: string;
  recommendation: Recommendation;
  executionPriority: ExecutionPriority;
  allocatedMinutes: number;
  order: ExecutionOrderPhase;
  explanation: string[];
}

export class ExecutionItem {
  private readonly props: ExecutionItemProps;

  constructor(props: ExecutionItemProps) {
    this.props = Object.freeze({ ...props });
  }

  get id(): string { return this.props.id; }
  get recommendation(): Recommendation { return this.props.recommendation; }
  get executionPriority(): ExecutionPriority { return this.props.executionPriority; }
  get allocatedMinutes(): number { return this.props.allocatedMinutes; }
  get order(): ExecutionOrderPhase { return this.props.order; }
  get explanation(): readonly string[] { return this.props.explanation; }
}
