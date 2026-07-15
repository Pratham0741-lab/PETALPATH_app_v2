import { ProcessingStatus } from '../value-objects/processing-status.js';
import { ProcessingError } from '../value-objects/processing-error.js';
import { EvidenceSummary } from './evidence-summary.entity.js';
import { PerformanceSnapshot } from '../value-objects/performance-snapshot.js';

export interface DebtUpdate {
  debtId: string;
  topicId: string;
  action: 'CREATED' | 'RESOLVED' | 'NONE';
  severity: number;
}

export interface ReinforcementUpdate {
  topicId: string;
  action: 'ENQUEUED' | 'REVIEWED' | 'PAUSED' | 'RESUMED' | 'COMPLETED' | 'NONE';
  priority: number;
}

export interface ProcessingResultProps {
  id: string;
  eventId: string;
  status: ProcessingStatus;
  summary: EvidenceSummary;
  performanceSnapshot: PerformanceSnapshot | null;
  debtUpdates: DebtUpdate[];
  reinforcementUpdates: ReinforcementUpdate[];
  errors: ProcessingError[];
  processedAt: Date;
}

export class ProcessingResult {
  private readonly props: ProcessingResultProps;

  constructor(props: ProcessingResultProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(
    props: Omit<ProcessingResultProps, 'id' | 'processedAt'> & { id?: string; processedAt?: Date },
  ): ProcessingResult {
    return new ProcessingResult({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      processedAt: props.processedAt ?? new Date(),
    });
  }

  get id(): string { return this.props.id; }
  get eventId(): string { return this.props.eventId; }
  get status(): ProcessingStatus { return this.props.status; }
  get summary(): EvidenceSummary { return this.props.summary; }
  get performanceSnapshot(): PerformanceSnapshot | null { return this.props.performanceSnapshot; }
  get debtUpdates(): readonly DebtUpdate[] { return this.props.debtUpdates; }
  get reinforcementUpdates(): readonly ReinforcementUpdate[] { return this.props.reinforcementUpdates; }
  get errors(): readonly ProcessingError[] { return this.props.errors; }
  get processedAt(): Date { return this.props.processedAt; }

  get hasErrors(): boolean {
    return this.props.errors.length > 0;
  }
}
