import { KnowledgeStateType, Modality, ModalityStateType } from '../value-objects/intelligence-types.js';

export interface KnowledgeStateProps {
  id: string;
  childId: string;
  topicId: string;
  state: KnowledgeStateType;
  confidence: number;
  modalityCoverage: Record<string, ModalityStateType>;
  enteredAt: Date;
  lastTransitionAt: Date;
  transitionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class KnowledgeState {
  private readonly props: KnowledgeStateProps;

  constructor(props: KnowledgeStateProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<KnowledgeStateProps, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): KnowledgeState {
    const now = new Date();
    return new KnowledgeState({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get state(): KnowledgeStateType { return this.props.state; }
  get confidence(): number { return this.props.confidence; }
  get modalityCoverage(): Record<string, ModalityStateType> { return this.props.modalityCoverage; }
  get enteredAt(): Date { return this.props.enteredAt; }
  get lastTransitionAt(): Date { return this.props.lastTransitionAt; }
  get transitionReason(): string | undefined { return this.props.transitionReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  transitionTo(newState: KnowledgeStateType, confidence: number, reason: string): KnowledgeState {
    if (newState === this.props.state && confidence === this.props.confidence) {
      return this;
    }
    return new KnowledgeState({
      ...this.props,
      state: newState,
      confidence,
      lastTransitionAt: new Date(),
      transitionReason: reason,
      updatedAt: new Date(),
    });
  }

  updateModalityCoverage(modality: Modality, coverageState: ModalityStateType): KnowledgeState {
    const currentCoverage = { ...this.props.modalityCoverage };
    if (currentCoverage[modality] === coverageState) {
      return this;
    }
    return new KnowledgeState({
      ...this.props,
      modalityCoverage: {
        ...currentCoverage,
        [modality]: coverageState,
      },
      updatedAt: new Date(),
    });
  }

  updateConfidence(confidence: number): KnowledgeState {
    if (confidence === this.props.confidence) {
      return this;
    }
    return new KnowledgeState({
      ...this.props,
      confidence,
      updatedAt: new Date(),
    });
  }

}