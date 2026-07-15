export class EvidenceScore {
  readonly score: number;
  readonly confidence: number;
  readonly weight: number;

  constructor(score: number, confidence: number, weight: number = 1) {
    this.score = score;
    this.confidence = confidence;
    this.weight = weight;
  }

  get normalized(): number {
    return Math.max(0, Math.min(100, this.score));
  }

  get weightedScore(): number {
    return this.score * this.weight;
  }
}
