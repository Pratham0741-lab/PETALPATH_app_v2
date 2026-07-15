import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { isCorrectEvent } from '../../../adaptive-learning/domain/value-objects/event-types.js';
import { EvidenceRecord } from '../../domain/entities/evidence-record.entity.js';
import { EvidenceType } from '../../domain/value-objects/evidence-type.js';
import { EvidenceScore } from '../../domain/value-objects/evidence-score.js';

export class EvidenceAggregationService {
  aggregate(event: LearningEvent): EvidenceRecord[] {
    const records: EvidenceRecord[] = [];
    const correct = isCorrectEvent(event.eventType, event.payload?.correct);

    records.push(this.createCompletionEvidence(event, correct));

    const durationEvidence = this.createSpeedEvidence(event);
    if (durationEvidence) records.push(durationEvidence);

    const attemptEvidence = this.createAttemptEvidence(event, correct);
    if (attemptEvidence) records.push(attemptEvidence);

    return records;
  }

  private createCompletionEvidence(event: LearningEvent, correct: boolean): EvidenceRecord {
    const score = correct ? 1 : 0;
    const confidence = event.payload?.confidence as number ?? 0.5;

    return EvidenceRecord.create({
      eventId: event.eventId,
      childId: event.childId,
      topicId: event.topicId!,
      sessionId: event.sessionId,
      evidenceType: EvidenceType.COMPLETION,
      score: new EvidenceScore(score, confidence),
      metadata: {
        eventType: event.eventType,
        correct,
        modality: event.modality,
        duration: event.duration,
      },
      timestamp: event.timestamp,
    });
  }

  private createSpeedEvidence(event: LearningEvent): EvidenceRecord | null {
    if (event.duration === undefined || event.duration === null) return null;

    const normalizedSpeed = Math.min(100, Math.max(0, 100 - event.duration / 60000));
    const confidence = 0.7;

    return EvidenceRecord.create({
      eventId: event.eventId,
      childId: event.childId,
      topicId: event.topicId!,
      sessionId: event.sessionId,
      evidenceType: EvidenceType.SPEED,
      score: new EvidenceScore(normalizedSpeed, confidence),
      metadata: {
        durationMs: event.duration,
      },
      timestamp: event.timestamp,
    });
  }

  private createAttemptEvidence(event: LearningEvent, correct: boolean): EvidenceRecord | null {
    const payloadCorrect = event.payload?.correct;
    const hasAttemptInfo =
      event.payload?.attemptCount !== undefined ||
      event.payload?.hintUsed !== undefined ||
      event.payload?.isRetry !== undefined;

    if (!hasAttemptInfo && payloadCorrect === undefined) return null;

    return EvidenceRecord.create({
      eventId: event.eventId,
      childId: event.childId,
      topicId: event.topicId!,
      sessionId: event.sessionId,
      evidenceType: EvidenceType.ATTEMPT,
      score: new EvidenceScore(correct ? 1 : 0, 0.8),
      metadata: {
        correct,
        attemptCount: event.payload?.attemptCount ?? 1,
        hintUsed: event.payload?.hintUsed ?? false,
        isRetry: event.payload?.isRetry ?? false,
      },
      timestamp: event.timestamp,
    });
  }

}
