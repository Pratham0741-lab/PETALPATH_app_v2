import { DecisionContext } from './decision-context.entity.js';
import { DecisionResult } from './decision-result.entity.js';
import { DecisionSummary } from './decision-summary.entity.js';

export interface AdaptiveDecisionProps {
  id: string;
  childId: string;
  topicId: string;
  context: DecisionContext;
  result: DecisionResult;
  summary: DecisionSummary;
  evaluatedAt: Date;
}

export class AdaptiveDecision {
  private readonly props: AdaptiveDecisionProps;

  constructor(props: AdaptiveDecisionProps) {
    this.props = Object.freeze({ ...props });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get context(): DecisionContext { return this.props.context; }
  get result(): DecisionResult { return this.props.result; }
  get summary(): DecisionSummary { return this.props.summary; }
  get evaluatedAt(): Date { return this.props.evaluatedAt; }
}
