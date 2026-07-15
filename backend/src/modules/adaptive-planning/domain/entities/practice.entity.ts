import { PracticeType } from '../value-objects/planning-types.js';

export interface PracticeProps {
  id: string;
  childId: string;
  topicId: string;
  modality?: string;
  type: PracticeType;
  debtId?: string;
  scheduledFor: Date;
  completedAt?: Date;
  completed: boolean;
  createdAt: Date;
}

export class Practice {
  private readonly props: PracticeProps;

  constructor(props: PracticeProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<PracticeProps, 'id' | 'createdAt' | 'completed'> & { id?: string; completedAt?: Date; completed?: boolean }): Practice {
    return new Practice({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: new Date(),
      completed: props.completed ?? false,
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get modality(): string | undefined { return this.props.modality; }
  get type(): PracticeType { return this.props.type; }
  get debtId(): string | undefined { return this.props.debtId; }
  get scheduledFor(): Date { return this.props.scheduledFor; }
  get completedAt(): Date | undefined { return this.props.completedAt; }
  get completed(): boolean { return this.props.completed; }
  get createdAt(): Date { return this.props.createdAt; }

  complete(): Practice {
    return new Practice({
      ...this.props,
      completed: true,
      completedAt: new Date(),
    });
  }

}