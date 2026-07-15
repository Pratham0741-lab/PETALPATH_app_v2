import { TopicStateType, ModalityStateType, Modality } from '../value-objects/intelligence-types.js';

export interface TopicStateProps {
  id: string;
  childId: string;
  topicId: string;
  state: TopicStateType;
  modalityStates: Record<string, ModalityStateType>;
  enteredAt: Date;
  lastTransitionAt: Date;
  transitionReason?: string;
  evidenceSummary?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class TopicState {
  private readonly props: TopicStateProps;

  constructor(props: TopicStateProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<TopicStateProps, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): TopicState {
    const now = new Date();
    return new TopicState({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get state(): TopicStateType { return this.props.state; }
  get modalityStates(): Record<string, ModalityStateType> { return this.props.modalityStates; }
  get enteredAt(): Date { return this.props.enteredAt; }
  get lastTransitionAt(): Date { return this.props.lastTransitionAt; }
  get transitionReason(): string | undefined { return this.props.transitionReason; }
  get evidenceSummary(): Record<string, unknown> | undefined { return this.props.evidenceSummary; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  transitionTo(newState: TopicStateType, reason: string, evidenceSummary?: Record<string, unknown>): TopicState {
    if (newState === this.props.state) {
      return this;
    }
    return new TopicState({
      ...this.props,
      state: newState,
      lastTransitionAt: new Date(),
      transitionReason: reason,
      evidenceSummary: evidenceSummary ?? this.props.evidenceSummary,
      updatedAt: new Date(),
    });
  }

  updateModalityState(modality: string, newState: ModalityStateType): TopicState {
    const currentModalityStates = { ...this.props.modalityStates };
    if (currentModalityStates[modality] === newState) {
      return this;
    }
    return new TopicState({
      ...this.props,
      modalityStates: {
        ...currentModalityStates,
        [modality]: newState,
      },
      updatedAt: new Date(),
    });
  }

}