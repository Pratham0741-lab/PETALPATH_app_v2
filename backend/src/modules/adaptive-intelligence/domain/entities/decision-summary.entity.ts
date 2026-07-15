export interface DecisionSummaryProps {
  totalDecisions: number;
  primaryFocus: string;
  urgency: string;
  keyAction: string;
  recommendedDifficulty: string;
  recommendedModality: string | null;
  interventionLevel: string;
}

export class DecisionSummary {
  private readonly props: DecisionSummaryProps;

  constructor(props: DecisionSummaryProps) {
    this.props = Object.freeze({ ...props });
  }

  get totalDecisions(): number { return this.props.totalDecisions; }
  get primaryFocus(): string { return this.props.primaryFocus; }
  get urgency(): string { return this.props.urgency; }
  get keyAction(): string { return this.props.keyAction; }
  get recommendedDifficulty(): string { return this.props.recommendedDifficulty; }
  get recommendedModality(): string | null { return this.props.recommendedModality; }
  get interventionLevel(): string { return this.props.interventionLevel; }
}
