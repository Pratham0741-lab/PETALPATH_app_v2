import { LearningState } from '../../../learning-state/domain/entities/learning-state.entity.js';
import { AdaptiveConstraints } from '../value-objects/adaptive-constraints.js';

export interface DebtInfo {
  debtId: string;
  topicId: string;
  debtType: string;
  severity: number;
  resolved: boolean;
}

export interface ReinforcementInfo {
  queueId: string;
  topicId: string;
  status: string;
  priority: number;
  nextReviewAt: Date | null;
}

export interface RecoveryInfo {
  recoveryId: string;
  status: string;
  currentTier: number;
  triggerReason: string;
}

export interface DecisionContextProps {
  childId: string;
  topicId: string;
  learningState: LearningState;
  unresolvedDebts: DebtInfo[];
  reinforcementItems: ReinforcementInfo[];
  activeRecovery: RecoveryInfo | null;
  constraints: AdaptiveConstraints;
  sessionElapsedMinutes: number;
  sessionRemainingMinutes: number;
}

export class DecisionContext {
  private readonly props: DecisionContextProps;

  constructor(props: DecisionContextProps) {
    this.props = Object.freeze({ ...props });
  }

  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get learningState(): LearningState { return this.props.learningState; }
  get unresolvedDebts(): readonly DebtInfo[] { return this.props.unresolvedDebts; }
  get reinforcementItems(): readonly ReinforcementInfo[] { return this.props.reinforcementItems; }
  get activeRecovery(): RecoveryInfo | null { return this.props.activeRecovery; }
  get constraints(): AdaptiveConstraints { return this.props.constraints; }
  get sessionElapsedMinutes(): number { return this.props.sessionElapsedMinutes; }
  get sessionRemainingMinutes(): number { return this.props.sessionRemainingMinutes; }

  get totalDebtSeverity(): number {
    return this.props.unresolvedDebts.reduce((sum, d) => sum + d.severity, 0);
  }

  get hasActiveDebts(): boolean {
    return this.props.unresolvedDebts.length > 0;
  }

  get isInRecovery(): boolean {
    return this.props.activeRecovery !== null && this.props.activeRecovery.status === 'ACTIVE';
  }
}
