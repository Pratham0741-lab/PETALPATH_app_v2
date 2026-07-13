import { SessionBlock } from './session-block.entity.js';

export enum SessionStatus {
  GENERATED = 'GENERATED',
  STARTED = 'STARTED',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export interface SessionPlanProps {
  id: string;
  childId: string;
  durationMinutes: number;
  status: SessionStatus;
  roadmapId?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  sessionBlocks?: SessionBlock[];
}

export class SessionPlan {
  private readonly props: SessionPlanProps;

  constructor(props: SessionPlanProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<SessionPlanProps, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: SessionStatus }): SessionPlan {
    return new SessionPlan({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      status: props.status ?? SessionStatus.GENERATED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get durationMinutes(): number { return this.props.durationMinutes; }
  get status(): SessionStatus { return this.props.status; }
  get roadmapId(): string | undefined { return this.props.roadmapId; }
  get startedAt(): Date | undefined { return this.props.startedAt; }
  get completedAt(): Date | undefined { return this.props.completedAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get sessionBlocks(): SessionBlock[] { return this.props.sessionBlocks ?? []; }

  start(): SessionPlan {
    return new SessionPlan({
      ...this.props,
      status: SessionStatus.STARTED,
      startedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  pause(): SessionPlan {
    return new SessionPlan({
      ...this.props,
      status: SessionStatus.PAUSED,
      updatedAt: new Date(),
    });
  }

  resume(): SessionPlan {
    return new SessionPlan({
      ...this.props,
      status: SessionStatus.STARTED,
      updatedAt: new Date(),
    });
  }

  complete(): SessionPlan {
    return new SessionPlan({
      ...this.props,
      status: SessionStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  abandon(): SessionPlan {
    return new SessionPlan({
      ...this.props,
      status: SessionStatus.ABANDONED,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  toPrismaCreate(): Record<string, unknown> {
    return {
      id: this.props.id,
      child: { connect: { id: this.props.childId } },
      durationMinutes: this.props.durationMinutes,
      status: this.props.status,
      roadmapId: this.props.roadmapId ?? null,
      startedAt: this.props.startedAt ?? null,
      completedAt: this.props.completedAt ?? null,
    };
  }

  toPrismaUpdate(): Record<string, unknown> {
    return {
      status: this.props.status,
      startedAt: this.props.startedAt ?? null,
      completedAt: this.props.completedAt ?? null,
      updatedAt: this.props.updatedAt,
    };
  }
}