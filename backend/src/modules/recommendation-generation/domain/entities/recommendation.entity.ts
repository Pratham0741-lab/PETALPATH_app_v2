import { RecommendationType } from '../value-objects/recommendation-type.js';
import { RecommendationPriority } from '../value-objects/recommendation-priority.js';
import { RecommendationConfidence } from '../value-objects/recommendation-confidence.js';
import { EstimatedDuration } from '../value-objects/estimated-duration.js';

export interface RecommendationProps {
  id: string;
  recommendationType: RecommendationType;
  topicId: string;
  roadmapItemId: string | null;
  modality: string | null;
  difficulty: string;
  estimatedDuration: EstimatedDuration;
  priority: RecommendationPriority;
  confidence: RecommendationConfidence;
  explanation: string[];
  prerequisitesSatisfied: boolean;
  recoveryAware: boolean;
  reinforcementAware: boolean;
  source: string;
}

export class Recommendation {
  private readonly props: RecommendationProps;

  constructor(props: RecommendationProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(
    props: Omit<RecommendationProps, 'id'> & { id?: string },
  ): Recommendation {
    return new Recommendation({
      ...props,
      id: props.id ?? crypto.randomUUID(),
    });
  }

  get id(): string { return this.props.id; }
  get recommendationType(): RecommendationType { return this.props.recommendationType; }
  get topicId(): string { return this.props.topicId; }
  get roadmapItemId(): string | null { return this.props.roadmapItemId; }
  get modality(): string | null { return this.props.modality; }
  get difficulty(): string { return this.props.difficulty; }
  get estimatedDuration(): EstimatedDuration { return this.props.estimatedDuration; }
  get priority(): RecommendationPriority { return this.props.priority; }
  get confidence(): RecommendationConfidence { return this.props.confidence; }
  get explanation(): readonly string[] { return this.props.explanation; }
  get prerequisitesSatisfied(): boolean { return this.props.prerequisitesSatisfied; }
  get recoveryAware(): boolean { return this.props.recoveryAware; }
  get reinforcementAware(): boolean { return this.props.reinforcementAware; }
  get source(): string { return this.props.source; }
}
