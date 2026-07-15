import { AdaptiveDecision } from '../../../adaptive-intelligence/domain/entities/adaptive-decision.entity.js';
import { DebtInfo, ReinforcementInfo, RecoveryInfo } from '../../../adaptive-intelligence/domain/entities/decision-context.entity.js';
import { AdaptiveConstraints } from '../../../adaptive-intelligence/domain/value-objects/adaptive-constraints.js';

export interface RoadmapSection {
  sectionType: string;
  topicId: string | null;
  modality: string;
  estimatedMinutes: number;
  effortLevel: number;
  priority: number;
  order: number;
  metadata: Record<string, unknown>;
}

export interface RecommendationContextProps {
  childId: string;
  topicId: string;
  adaptiveDecision: AdaptiveDecision;
  roadmapSections: RoadmapSection[];
  unresolvedDebts: DebtInfo[];
  reinforcementItems: ReinforcementInfo[];
  activeRecovery: RecoveryInfo | null;
  constraints: AdaptiveConstraints;
}

export class RecommendationContext {
  private readonly props: RecommendationContextProps;

  constructor(props: RecommendationContextProps) {
    this.props = Object.freeze({ ...props });
  }

  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get adaptiveDecision(): AdaptiveDecision { return this.props.adaptiveDecision; }
  get roadmapSections(): readonly RoadmapSection[] { return this.props.roadmapSections; }
  get unresolvedDebts(): readonly DebtInfo[] { return this.props.unresolvedDebts; }
  get reinforcementItems(): readonly ReinforcementInfo[] { return this.props.reinforcementItems; }
  get activeRecovery(): RecoveryInfo | null { return this.props.activeRecovery; }
  get constraints(): AdaptiveConstraints { return this.props.constraints; }

  get isRecoveryActive(): boolean {
    return this.props.activeRecovery !== null;
  }
}
