export interface RecommendationSummaryProps {
  totalRecommendations: number;
  topPriority: number;
  topType: string;
  primarySource: string;
  hasRecoveryRecommendations: boolean;
  hasUrgentRecommendations: boolean;
}

export class RecommendationSummary {
  private readonly props: RecommendationSummaryProps;

  constructor(props: RecommendationSummaryProps) {
    this.props = Object.freeze({ ...props });
  }

  get totalRecommendations(): number { return this.props.totalRecommendations; }
  get topPriority(): number { return this.props.topPriority; }
  get topType(): string { return this.props.topType; }
  get primarySource(): string { return this.props.primarySource; }
  get hasRecoveryRecommendations(): boolean { return this.props.hasRecoveryRecommendations; }
  get hasUrgentRecommendations(): boolean { return this.props.hasUrgentRecommendations; }
}
