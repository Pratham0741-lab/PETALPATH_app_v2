import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningDebtService } from '../../../adaptive-planning/application/services/learning-debt.service.js';
import { EvidenceRecord } from '../../domain/entities/evidence-record.entity.js';
import { DebtUpdate } from '../../domain/entities/processing-result.entity.js';
import { EvidenceType } from '../../domain/value-objects/evidence-type.js';
import { ProcessingFailedError } from '../../domain/errors.js';

export class LearningDebtProcessor {
  private readonly DEBT_SEVERITY_THRESHOLD = 0.6;
  private readonly PRACTICE_DEBT_SEVERITY = 0.7;
  private readonly REINFORCEMENT_DEBT_SEVERITY = 0.5;
  private readonly REVIEW_DEBT_SEVERITY = 0.4;

  constructor(private readonly debtService: LearningDebtService) {}

  async process(
    event: LearningEvent,
    records: EvidenceRecord[],
  ): Promise<DebtUpdate[]> {
    try {
      const updates: DebtUpdate[] = [];

      const attemptEvidence = records.find(r => r.evidenceType === EvidenceType.ATTEMPT);
      if (attemptEvidence) {
        const update = await this.processAttemptEvidence(event, attemptEvidence);
        if (update) updates.push(update);
      }

      const completionEvidence = records.find(r => r.evidenceType === EvidenceType.COMPLETION);
      if (completionEvidence) {
        const update = await this.processCompletionEvidence(event, completionEvidence);
        if (update) updates.push(update);
      }

      return updates;
    } catch (error) {
      throw new ProcessingFailedError(
        'LearningDebtProcessor',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async processAttemptEvidence(
    event: LearningEvent,
    record: EvidenceRecord,
  ): Promise<DebtUpdate | null> {
    const correct = record.metadata.correct as boolean;
    const hintUsed = record.metadata.hintUsed as boolean;
    const isRetry = record.metadata.isRetry as boolean;

    if (!correct || hintUsed || isRetry) {
      const severity = isRetry || hintUsed
        ? this.PRACTICE_DEBT_SEVERITY + 0.1
        : this.PRACTICE_DEBT_SEVERITY;

      const debt = await this.debtService.createDebt({
        childId: event.childId,
        topicId: event.topicId!,
        modality: event.modality,
        debtType: 'PRACTICE',
        severity: Math.min(1, severity),
        description: hintUsed
          ? `Hint used during activity for topic ${event.topicId}`
          : isRetry
            ? `Retry needed for topic ${event.topicId}`
            : `Incorrect attempt on topic ${event.topicId}`,
      });

      return {
        debtId: debt.id,
        topicId: event.topicId!,
        action: 'CREATED',
        severity: debt.severity,
      };
    }

    return null;
  }

  private async processCompletionEvidence(
    event: LearningEvent,
    record: EvidenceRecord,
  ): Promise<DebtUpdate | null> {
    const correct = record.metadata.correct as boolean;

    if (correct) {
      const resolved = await this.debtService.resolveDebtsForTopic(
        event.childId,
        event.topicId!,
        event.modality,
      );

      if (resolved > 0) {
        return {
          debtId: `${event.topicId}-batch`,
          topicId: event.topicId!,
          action: 'RESOLVED',
          severity: 0,
        };
      }
    }

    return null;
  }
}
