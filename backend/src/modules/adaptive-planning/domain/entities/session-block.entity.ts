import { SessionBlockType, ActivityType, DifficultyLevel } from '../value-objects/planning-types.js';

export enum SessionBlockStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export { SessionBlockType, ActivityType, DifficultyLevel };

export interface SessionBlockProps {
  id: string;
  sessionPlanId: string;
  type: SessionBlockType;
  topicId?: string;
  modality?: string;
  activityType: ActivityType;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  effortLevel: number;
  order: number;
  isReinforcement: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  status: SessionBlockStatus;
}

export class SessionBlock {
  private readonly props: SessionBlockProps;

  constructor(props: SessionBlockProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<SessionBlockProps, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SessionBlock {
    const now = new Date();
    return new SessionBlock({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: props.status ?? SessionBlockStatus.PENDING,
    });
  }

  get id(): string { return this.props.id; }
  get sessionPlanId(): string { return this.props.sessionPlanId; }
  get type(): SessionBlockType { return this.props.type; }
  get topicId(): string | undefined { return this.props.topicId; }
  get modality(): string | undefined { return this.props.modality; }
  get activityType(): ActivityType { return this.props.activityType; }
  get difficulty(): DifficultyLevel { return this.props.difficulty; }
  get estimatedMinutes(): number { return this.props.estimatedMinutes; }
  get effortLevel(): number { return this.props.effortLevel; }
  get order(): number { return this.props.order; }
  get isReinforcement(): boolean { return this.props.isReinforcement; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get status(): SessionBlockStatus { return this.props.status; }

  complete(): SessionBlock {
    return new SessionBlock({
      ...this.props,
      status: SessionBlockStatus.COMPLETED,
      updatedAt: new Date(),
    });
  }

  skip(): SessionBlock {
    return new SessionBlock({
      ...this.props,
      status: SessionBlockStatus.SKIPPED,
      updatedAt: new Date(),
    });
  }

  start(): SessionBlock {
    return new SessionBlock({
      ...this.props,
      status: SessionBlockStatus.IN_PROGRESS,
      updatedAt: new Date(),
    });
  }

  toPrismaCreate(): Record<string, unknown> {
    return {
      id: this.props.id,
      sessionPlan: { connect: { id: this.props.sessionPlanId } },
      skillId: null,
      subjectId: null,
      activityType: this.props.activityType,
      difficulty: this.props.difficulty,
      estimatedMinutes: this.props.estimatedMinutes,
      position: this.props.order,
      status: this.props.status,
      isReinforcement: this.props.isReinforcement,
      metadata: this.props.metadata ? JSON.stringify(this.props.metadata) : null,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  toPrismaUpdate(): Record<string, unknown> {
    return {
      activityType: this.props.activityType,
      difficulty: this.props.difficulty,
      estimatedMinutes: this.props.estimatedMinutes,
      position: this.props.order,
      status: this.props.status,
      isReinforcement: this.props.isReinforcement,
      metadata: this.props.metadata ? JSON.stringify(this.props.metadata) : null,
      updatedAt: this.props.updatedAt,
    };
  }
}