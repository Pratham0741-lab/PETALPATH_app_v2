import { EvidenceRecord } from './evidence-record.entity.js';

export interface EvidenceBatchProps {
  id: string;
  childId: string;
  sessionId: string;
  records: EvidenceRecord[];
  processedAt: Date;
}

export class EvidenceBatch {
  private readonly props: EvidenceBatchProps;

  constructor(props: EvidenceBatchProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(
    props: Omit<EvidenceBatchProps, 'id' | 'processedAt'> & { id?: string; processedAt?: Date },
  ): EvidenceBatch {
    return new EvidenceBatch({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      processedAt: props.processedAt ?? new Date(),
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get sessionId(): string { return this.props.sessionId; }
  get records(): readonly EvidenceRecord[] { return this.props.records; }
  get processedAt(): Date { return this.props.processedAt; }

  get totalRecords(): number { return this.props.records.length; }
}
