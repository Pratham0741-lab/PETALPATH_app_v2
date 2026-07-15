import { LearningEventType, Modality } from '../value-objects/event-types.js';

export interface LearningEventProps {
  eventId: string;
  eventType: LearningEventType;
  eventVersion: number;
  childId: string;
  sessionId: string;
  curriculumId?: string;
  subjectId?: string;
  moduleId?: string;
  topicId?: string;
  conceptId?: string;
  activityId?: string;
  modality?: Modality;
  timestamp: Date;
  duration?: number;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface CreateLearningEventProps extends Omit<LearningEventProps, 'idempotencyKey' | 'eventId'> {
  eventId?: string;
  idempotencyKey?: string;
}

export class LearningEvent {
  private readonly props: LearningEventProps;

  constructor(props: LearningEventProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: CreateLearningEventProps): LearningEvent {
    const eventId = props.eventId ?? crypto.randomUUID();
    const idempotencyKey = props.idempotencyKey ?? crypto.randomUUID();
    
    return new LearningEvent({
      ...props,
      eventId,
      idempotencyKey,
    } as LearningEventProps);
  }

  get eventId(): string { return this.props.eventId; }
  get eventType(): LearningEventType { return this.props.eventType; }
  get eventVersion(): number { return this.props.eventVersion; }
  get childId(): string { return this.props.childId; }
  get sessionId(): string { return this.props.sessionId; }
  get curriculumId(): string | undefined { return this.props.curriculumId; }
  get subjectId(): string | undefined { return this.props.subjectId; }
  get moduleId(): string | undefined { return this.props.moduleId; }
  get topicId(): string | undefined { return this.props.topicId; }
  get conceptId(): string | undefined { return this.props.conceptId; }
  get activityId(): string | undefined { return this.props.activityId; }
  get modality(): Modality | undefined { return this.props.modality; }
  get timestamp(): Date { return this.props.timestamp; }
  get duration(): number | undefined { return this.props.duration; }
  get payload(): Record<string, unknown> | undefined { return this.props.payload; }
  get idempotencyKey(): string { return this.props.idempotencyKey; }

}