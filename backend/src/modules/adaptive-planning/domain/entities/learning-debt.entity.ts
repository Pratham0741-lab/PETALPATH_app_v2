import { LearningDebtType } from '../value-objects/planning-types.js';

export interface LearningDebtProps {
  id: string;
  childId: string;
  topicId: string;
  modality?: string;
  debtType: LearningDebtType;
  severity: number;
  description: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolved: boolean;
}

export class LearningDebt {
  private readonly props: LearningDebtProps;

  constructor(props: LearningDebtProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<LearningDebtProps, 'id' | 'createdAt' | 'resolved'> & { id?: string; resolvedAt?: Date; resolved?: boolean }): LearningDebt {
    return new LearningDebt({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: new Date(),
      resolved: props.resolved ?? false,
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get modality(): string | undefined { return this.props.modality; }
  get debtType(): LearningDebtType { return this.props.debtType; }
  get severity(): number { return this.props.severity; }
  get description(): string { return this.props.description; }
  get createdAt(): Date { return this.props.createdAt; }
  get resolvedAt(): Date | undefined { return this.props.resolvedAt; }
  get resolved(): boolean { return this.props.resolved; }

  resolve(): LearningDebt {
    if (this.props.resolved) return this;
    return new LearningDebt({
      ...this.props,
      resolved: true,
      resolvedAt: new Date(),
    });
  }

  toPrismaCreate(): any {
    return {
      id: this.props.id,
      childId: this.props.childId,
      topicId: this.props.topicId,
      modality: this.props.modality ?? null,
      debtType: this.props.debtType,
      severity: this.props.severity,
      description: this.props.description,
      createdAt: this.props.createdAt,
      resolvedAt: this.props.resolvedAt ?? null,
      resolved: this.props.resolved,
    };
  }
}