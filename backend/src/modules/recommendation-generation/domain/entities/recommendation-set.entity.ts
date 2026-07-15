import { Recommendation } from './recommendation.entity.js';
import { RecommendationSummary } from './recommendation-summary.entity.js';
import { RecommendationTrace } from './recommendation-trace.entity.js';

export interface RecommendationSetProps {
  id: string;
  childId: string;
  topicId: string;
  recommendations: Recommendation[];
  summary: RecommendationSummary;
  evaluatedAt: Date;
  traces: RecommendationTrace[];
}

export class RecommendationSet {
  private readonly props: RecommendationSetProps;

  constructor(props: RecommendationSetProps) {
    this.props = Object.freeze({ ...props });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get recommendations(): readonly Recommendation[] { return this.props.recommendations; }
  get summary(): RecommendationSummary { return this.props.summary; }
  get evaluatedAt(): Date { return this.props.evaluatedAt; }
  get traces(): readonly RecommendationTrace[] { return this.props.traces; }

  get totalCount(): number { return this.props.recommendations.length; }

  get topRecommendation(): Recommendation | null {
    return this.props.recommendations[0] ?? null;
  }

  byType(type: string): Recommendation[] {
    return this.props.recommendations.filter(r => r.recommendationType === type);
  }
}
