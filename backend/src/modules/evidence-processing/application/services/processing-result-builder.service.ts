import { EvidenceRecord } from '../../domain/entities/evidence-record.entity.js';
import { EvidenceSummary } from '../../domain/entities/evidence-summary.entity.js';
import { ProcessingResult, DebtUpdate, ReinforcementUpdate } from '../../domain/entities/processing-result.entity.js';
import { ProcessingStatus } from '../../domain/value-objects/processing-status.js';
import { ProcessingError } from '../../domain/value-objects/processing-error.js';
import { PerformanceSnapshot } from '../../domain/value-objects/performance-snapshot.js';

export class ProcessingResultBuilder {
  private eventId: string = '';
  private records: EvidenceRecord[] = [];
  private snapshot: PerformanceSnapshot | null = null;
  private debtUpdates: DebtUpdate[] = [];
  private reinforcementUpdates: ReinforcementUpdate[] = [];
  private errors: ProcessingError[] = [];

  withEventId(eventId: string): this {
    this.eventId = eventId;
    return this;
  }

  withRecords(records: EvidenceRecord[]): this {
    this.records = records;
    return this;
  }

  withPerformanceSnapshot(snapshot: PerformanceSnapshot | null): this {
    this.snapshot = snapshot;
    return this;
  }

  withDebtUpdates(updates: DebtUpdate[]): this {
    this.debtUpdates = updates;
    return this;
  }

  withReinforcementUpdates(updates: ReinforcementUpdate[]): this {
    this.reinforcementUpdates = updates;
    return this;
  }

  withError(error: ProcessingError): this {
    this.errors.push(error);
    return this;
  }

  withErrors(errors: ProcessingError[]): this {
    this.errors.push(...errors);
    return this;
  }

  build(): ProcessingResult {
    const totalRecords = this.records.length;
    const failedRecords = this.errors.length;
    const successfulRecords = this.records.filter(r => r.score.score > 0).length;

    const summary = new EvidenceSummary({
      totalRecords,
      successfulRecords,
      failedRecords,
      masteryDelta: this.snapshot?.mastery ?? 0,
      confidenceDelta: this.snapshot?.confidence ?? 0,
      debtsCreated: this.debtUpdates.filter(d => d.action === 'CREATED').length,
      debtsResolved: this.debtUpdates.filter(d => d.action === 'RESOLVED').length,
      queueEnqueued: this.reinforcementUpdates.filter(r => r.action === 'ENQUEUED').length,
      queueUpdated: this.reinforcementUpdates.filter(
        r => r.action === 'REVIEWED' || r.action === 'COMPLETED',
      ).length,
    });

    const status = this.errors.length > 0
      ? successfulRecords > 0
        ? ProcessingStatus.PARTIALLY_COMPLETED
        : ProcessingStatus.FAILED
      : ProcessingStatus.COMPLETED;

    return ProcessingResult.create({
      eventId: this.eventId,
      status,
      summary,
      performanceSnapshot: this.snapshot,
      debtUpdates: this.debtUpdates,
      reinforcementUpdates: this.reinforcementUpdates,
      errors: this.errors,
    });
  }
}
