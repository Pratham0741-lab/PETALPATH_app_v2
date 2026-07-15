export class TimeAllocation {
  readonly minutes: number;
  readonly percentage: number;
  readonly remainingTime: number;
  readonly utilization: number;

  constructor(minutes: number, totalAvailable: number) {
    this.minutes = Math.max(1, Math.round(minutes));
    this.percentage = totalAvailable > 0
      ? Math.round((this.minutes / totalAvailable) * 100)
      : 0;
    this.remainingTime = Math.max(0, totalAvailable - this.minutes);
    this.utilization = totalAvailable > 0
      ? Math.round((this.minutes / totalAvailable) * 100)
      : 0;
  }
}
