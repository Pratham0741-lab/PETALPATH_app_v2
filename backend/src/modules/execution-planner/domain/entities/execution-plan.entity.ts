import { ExecutionItem } from './execution-item.entity.js';
import { ExecutionSummary } from './execution-summary.entity.js';
import { ExecutionTrace } from './execution-trace.entity.js';

export interface ExecutionPlanProps {
  id: string;
  childId: string;
  items: ExecutionItem[];
  summary: ExecutionSummary;
  totalDuration: number;
  unusedMinutes: number;
  traces: ExecutionTrace[];
}

export class ExecutionPlan {
  private readonly props: ExecutionPlanProps;

  constructor(props: ExecutionPlanProps) {
    this.props = Object.freeze({ ...props });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get items(): readonly ExecutionItem[] { return this.props.items; }
  get summary(): ExecutionSummary { return this.props.summary; }
  get totalDuration(): number { return this.props.totalDuration; }
  get unusedMinutes(): number { return this.props.unusedMinutes; }
  get traces(): readonly ExecutionTrace[] { return this.props.traces; }

  get utilization(): number {
    const total = this.totalDuration + this.unusedMinutes;
    return total > 0 ? Math.round((this.totalDuration / total) * 100) : 0;
  }
}
