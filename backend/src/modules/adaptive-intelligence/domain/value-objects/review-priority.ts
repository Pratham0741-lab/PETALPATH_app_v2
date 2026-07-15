export class ReviewPriority {
  readonly priority: number;
  readonly nextReviewDate: Date | null;
  readonly retentionProbability: number;
  readonly reason: string;

  constructor(props: {
    priority: number;
    nextReviewDate: Date | null;
    retentionProbability: number;
    reason: string;
  }) {
    this.priority = props.priority;
    this.nextReviewDate = props.nextReviewDate;
    this.retentionProbability = props.retentionProbability;
    this.reason = props.reason;
  }

  get isOverdue(): boolean {
    if (!this.nextReviewDate) return false;
    return new Date() > this.nextReviewDate;
  }
}
