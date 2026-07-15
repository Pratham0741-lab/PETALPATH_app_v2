import { DifficultyRecommendation } from '../value-objects/difficulty-recommendation.js';
import { ReviewPriority } from '../value-objects/review-priority.js';
import { PriorityScore } from '../value-objects/priority-score.js';
import { SpacingAdjustment } from '../value-objects/spacing-adjustment.js';
import { InterventionLevel } from '../value-objects/intervention-level.js';
import { DecisionConfidence } from '../value-objects/decision-confidence.js';
import { DecisionTrace } from './decision-trace.entity.js';

export interface DecisionResultProps {
  difficulty: DifficultyRecommendation;
  reviewPriority: ReviewPriority;
  reinforcementPriority: PriorityScore;
  debtPriority: PriorityScore;
  masteryPriority: PriorityScore;
  confidenceAdjustment: number;
  spacingAdjustment: SpacingAdjustment;
  nextReviewDate: Date | null;
  recommendedModality: string | null;
  interventionLevel: InterventionLevel;
  explanation: string[];
  confidenceScore: DecisionConfidence;
  traces: DecisionTrace[];
}

export class DecisionResult {
  private readonly props: DecisionResultProps;

  constructor(props: DecisionResultProps) {
    this.props = Object.freeze({ ...props });
  }

  get difficulty(): DifficultyRecommendation { return this.props.difficulty; }
  get reviewPriority(): ReviewPriority { return this.props.reviewPriority; }
  get reinforcementPriority(): PriorityScore { return this.props.reinforcementPriority; }
  get debtPriority(): PriorityScore { return this.props.debtPriority; }
  get masteryPriority(): PriorityScore { return this.props.masteryPriority; }
  get confidenceAdjustment(): number { return this.props.confidenceAdjustment; }
  get spacingAdjustment(): SpacingAdjustment { return this.props.spacingAdjustment; }
  get nextReviewDate(): Date | null { return this.props.nextReviewDate; }
  get recommendedModality(): string | null { return this.props.recommendedModality; }
  get interventionLevel(): InterventionLevel { return this.props.interventionLevel; }
  get explanation(): readonly string[] { return this.props.explanation; }
  get confidenceScore(): DecisionConfidence { return this.props.confidenceScore; }
  get traces(): readonly DecisionTrace[] { return this.props.traces; }
}
