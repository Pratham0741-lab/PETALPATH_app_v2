export class RecommendationWeight {
  readonly value: number;
  readonly category: string;

  constructor(value: number, category: string) {
    this.value = value;
    this.category = category;
  }
}
