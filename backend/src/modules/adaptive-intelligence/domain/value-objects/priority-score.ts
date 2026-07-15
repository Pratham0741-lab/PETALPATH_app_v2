export class PriorityScore {
  readonly score: number;
  readonly weight: number;
  readonly category: string;

  constructor(score: number, weight: number, category: string) {
    this.score = score;
    this.weight = weight;
    this.category = category;
  }

  get weightedScore(): number {
    return this.score * this.weight;
  }

  get normalizedScore(): number {
    return Math.max(0, Math.min(100, this.score));
  }
}
