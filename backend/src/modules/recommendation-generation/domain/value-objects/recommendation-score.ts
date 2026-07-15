export class RecommendationScore {
  readonly total: number;
  readonly weighted: number;

  constructor(total: number, weighted: number) {
    this.total = total;
    this.weighted = weighted;
  }
}
