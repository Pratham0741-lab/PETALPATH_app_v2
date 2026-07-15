import { EvidenceType } from '../value-objects/evidence-type.js';
import { EvidenceScore } from '../value-objects/evidence-score.js';

export interface EvidenceRecordProps {
  id: string;
  eventId: string;
  childId: string;
  topicId: string;
  sessionId: string;
  evidenceType: EvidenceType;
  score: EvidenceScore;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export class EvidenceRecord {
  private readonly props: EvidenceRecordProps;

  constructor(props: EvidenceRecordProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(
    props: Omit<EvidenceRecordProps, 'id'> & { id?: string },
  ): EvidenceRecord {
    return new EvidenceRecord({
      ...props,
      id: props.id ?? crypto.randomUUID(),
    });
  }

  get id(): string { return this.props.id; }
  get eventId(): string { return this.props.eventId; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get sessionId(): string { return this.props.sessionId; }
  get evidenceType(): EvidenceType { return this.props.evidenceType; }
  get score(): EvidenceScore { return this.props.score; }
  get metadata(): Record<string, unknown> { return this.props.metadata; }
  get timestamp(): Date { return this.props.timestamp; }
}
