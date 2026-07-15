export class DecisionConfidence {
  readonly score: number;
  readonly weight: number;
  readonly contributingFactors: string[];

  constructor(props: {
    score: number;
    weight: number;
    contributingFactors: string[];
  }) {
    this.score = props.score;
    this.weight = props.weight;
    this.contributingFactors = props.contributingFactors;
  }

  get weightedScore(): number {
    return this.score * this.weight;
  }
}
