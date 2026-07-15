export class RetentionSnapshot {
  readonly retention: number;
  readonly stability: number;
  readonly forgettingRate: number;
  readonly reviewIntervalDays: number;
  readonly lastReviewedAt: Date | null;

  constructor(props: {
    retention: number;
    stability: number;
    forgettingRate: number;
    reviewIntervalDays: number;
    lastReviewedAt: Date | null;
  }) {
    this.retention = props.retention;
    this.stability = props.stability;
    this.forgettingRate = props.forgettingRate;
    this.reviewIntervalDays = props.reviewIntervalDays;
    this.lastReviewedAt = props.lastReviewedAt;
  }

  get needsReview(): boolean {
    if (!this.lastReviewedAt) return true;
    const daysSinceReview =
      (Date.now() - this.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReview >= this.reviewIntervalDays;
  }
}
