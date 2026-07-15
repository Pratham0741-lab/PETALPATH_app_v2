import { RecoveryModeStatus } from '../value-objects/planning-types.js';

export interface RecoveryModeProps {
  id: string;
  childId: string;
  status: RecoveryModeStatus;
  triggerReason: string;
  enteredAt: Date;
  resolvedAt?: Date;
  effortTierDrop: number;
  minTopicsAtTier: number;
  currentTier: number;
  createdAt: Date;
  updatedAt: Date;
}

export class RecoveryMode {
  private readonly props: RecoveryModeProps;

  constructor(props: RecoveryModeProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<RecoveryModeProps, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): RecoveryMode {
    const now = new Date();
    return new RecoveryMode({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get status(): RecoveryModeStatus { return this.props.status; }
  get triggerReason(): string { return this.props.triggerReason; }
  get enteredAt(): Date { return this.props.enteredAt; }
  get resolvedAt(): Date | undefined { return this.props.resolvedAt; }
  get effortTierDrop(): number { return this.props.effortTierDrop; }
  get minTopicsAtTier(): number { return this.props.minTopicsAtTier; }
  get currentTier(): number { return this.props.currentTier; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  resolve(): RecoveryMode {
    if (this.props.status === RecoveryModeStatus.RESOLVED) return this;
    return new RecoveryMode({
      ...this.props,
      status: RecoveryModeStatus.RESOLVED,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  advanceTier(): RecoveryMode {
    if (this.props.currentTier >= 7) return this;
    return new RecoveryMode({
      ...this.props,
      currentTier: this.props.currentTier + 1,
      updatedAt: new Date(),
    });
  }

}