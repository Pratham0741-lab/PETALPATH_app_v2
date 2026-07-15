export class EstimatedDuration {
  readonly minMinutes: number;
  readonly maxMinutes: number;

  constructor(minMinutes: number, maxMinutes: number) {
    this.minMinutes = Math.max(1, minMinutes);
    this.maxMinutes = Math.max(this.minMinutes, maxMinutes);
  }

  get average(): number {
    return Math.floor((this.minMinutes + this.maxMinutes) / 2);
  }

  get range(): string {
    return `${this.minMinutes}-${this.maxMinutes}`;
  }
}
