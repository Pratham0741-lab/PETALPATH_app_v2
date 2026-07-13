import { Modality, EvidenceType } from '../value-objects/event-types.js';

export interface LearningEvidenceProps {
  id: string;
  eventId: string;
  childId: string;
  sessionId: string;
  activityId?: string;
  topicId?: string;
  modality?: Modality;
  evidenceType: EvidenceType;
  observation: Record<string, unknown>;
  createdAt: Date;
}

export class LearningEvidence {
  private readonly props: LearningEvidenceProps;

  constructor(props: LearningEvidenceProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<LearningEvidenceProps, 'id' | 'createdAt'>): LearningEvidence {
    return new LearningEvidence({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  get id(): string { return this.props.id; }
  get eventId(): string { return this.props.eventId; }
  get childId(): string { return this.props.childId; }
  get sessionId(): string { return this.props.sessionId; }
  get activityId(): string | undefined { return this.props.activityId; }
  get topicId(): string | undefined { return this.props.topicId; }
  get modality(): Modality | undefined { return this.props.modality; }
  get evidenceType(): EvidenceType { return this.props.evidenceType; }
  get observation(): Record<string, unknown> { return this.props.observation; }
  get createdAt(): Date { return this.props.createdAt; }

  toPrismaCreate(): Record<string, unknown> {
    return {
      id: this.props.id,
      eventId: this.props.eventId,
      childId: this.props.childId,
      sessionId: this.props.sessionId,
      activityId: this.props.activityId,
      topicId: this.props.topicId,
      modality: this.props.modality,
      evidenceType: this.props.evidenceType,
      observation: JSON.stringify(this.props.observation),
      createdAt: this.props.createdAt,
    };
  }
}