import { RecommendationSet } from '../../../recommendation-generation/domain/entities/recommendation-set.entity.js';
import { AdaptiveDecision } from '../../../adaptive-intelligence/domain/entities/adaptive-decision.entity.js';
import { AdaptiveConstraints } from '../../../adaptive-intelligence/domain/value-objects/adaptive-constraints.js';
import { SessionBalance } from '../value-objects/session-balance.js';

export interface ExecutionContextProps {
  childId: string;
  recommendationSet: RecommendationSet;
  adaptiveDecision: AdaptiveDecision;
  availableMinutes: number;
  constraints: AdaptiveConstraints;
  balance: SessionBalance;
}

export class ExecutionContext {
  private readonly props: ExecutionContextProps;

  constructor(props: ExecutionContextProps) {
    this.props = Object.freeze({ ...props });
  }

  get childId(): string { return this.props.childId; }
  get recommendationSet(): RecommendationSet { return this.props.recommendationSet; }
  get adaptiveDecision(): AdaptiveDecision { return this.props.adaptiveDecision; }
  get availableMinutes(): number { return this.props.availableMinutes; }
  get constraints(): AdaptiveConstraints { return this.props.constraints; }
  get balance(): SessionBalance { return this.props.balance; }
}
