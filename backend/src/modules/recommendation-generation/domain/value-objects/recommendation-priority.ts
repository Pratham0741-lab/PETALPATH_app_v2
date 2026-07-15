export class RecommendationPriority {
  readonly score: number;
  readonly weight: number;

  constructor(score: number, weight: number = 1) {
    this.score = Math.max(0, Math.min(100, score));
    this.weight = weight;
  }

  get weightedScore(): number {
    return this.score * this.weight;
  }
}
