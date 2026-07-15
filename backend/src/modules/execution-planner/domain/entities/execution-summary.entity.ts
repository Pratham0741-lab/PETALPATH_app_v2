export interface ExecutionSummaryProps {
  totalTasks: number;
  roadmapCount: number;
  reviewCount: number;
  reinforcementCount: number;
  debtCount: number;
  recoveryCount: number;
  estimatedDuration: number;
  balanceScore: number;
}

export class ExecutionSummary {
  private readonly props: ExecutionSummaryProps;

  constructor(props: ExecutionSummaryProps) {
    this.props = Object.freeze({ ...props });
  }

  get totalTasks(): number { return this.props.totalTasks; }
  get roadmapCount(): number { return this.props.roadmapCount; }
  get reviewCount(): number { return this.props.reviewCount; }
  get reinforcementCount(): number { return this.props.reinforcementCount; }
  get debtCount(): number { return this.props.debtCount; }
  get recoveryCount(): number { return this.props.recoveryCount; }
  get estimatedDuration(): number { return this.props.estimatedDuration; }
  get balanceScore(): number { return this.props.balanceScore; }
}
