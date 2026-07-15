export interface BalanceRatios {
  roadmapRatio: number;
  reviewRatio: number;
  reinforcementRatio: number;
  debtRatio: number;
  recoveryRatio: number;
}

export class SessionBalance {
  readonly roadmapRatio: number;
  readonly reviewRatio: number;
  readonly reinforcementRatio: number;
  readonly debtRatio: number;
  readonly recoveryRatio: number;

  private static readonly DEFAULTS: BalanceRatios = {
    roadmapRatio: 40,
    reviewRatio: 25,
    reinforcementRatio: 15,
    debtRatio: 10,
    recoveryRatio: 10,
  };

  constructor(ratios?: Partial<BalanceRatios>) {
    const r = { ...SessionBalance.DEFAULTS, ...ratios };
    const total = r.roadmapRatio + r.reviewRatio + r.reinforcementRatio + r.debtRatio + r.recoveryRatio;
    if (total <= 0) throw new Error('Session balance ratios must sum to > 0');
    this.roadmapRatio = r.roadmapRatio;
    this.reviewRatio = r.reviewRatio;
    this.reinforcementRatio = r.reinforcementRatio;
    this.debtRatio = r.debtRatio;
    this.recoveryRatio = r.recoveryRatio;
  }

  get ratios(): BalanceRatios {
    return {
      roadmapRatio: this.roadmapRatio,
      reviewRatio: this.reviewRatio,
      reinforcementRatio: this.reinforcementRatio,
      debtRatio: this.debtRatio,
      recoveryRatio: this.recoveryRatio,
    };
  }

  get totalRatio(): number {
    return this.roadmapRatio + this.reviewRatio + this.reinforcementRatio + this.debtRatio + this.recoveryRatio;
  }
}
