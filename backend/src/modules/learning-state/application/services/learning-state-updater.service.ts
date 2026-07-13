import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningState } from '../../domain/entities/learning-state.entity.js';
import { IStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { MasteryCalculationService } from './mastery-calculation.service.js';
import { ConfidenceCalculationService } from './confidence-calculation.service.js';
import { ForgettingCurveService } from './forgetting-curve.service.js';

export class LearningStateUpdater {
  constructor(
    private readonly repository: IStateRepository,
    private readonly masteryCalculation: MasteryCalculationService,
    private readonly confidenceCalculation: ConfidenceCalculationService,
    private readonly forgettingCurve: ForgettingCurveService,
  ) {}

  async handleEvent(event: LearningEvent): Promise<LearningState> {
    const topicId = event.topicId;
    if (!topicId) {
      throw new Error('LearningEvent must have a topicId to update learning state');
    }

    const existing = await this.repository.findByTopic(event.childId, topicId);
    const state = existing ?? this.createInitialState(event);

    const correct = this.isCorrectEvent(event);
    const responseTimeMs = event.duration ?? 0;
    const hintUsed = (event.payload?.hintUsed as boolean) ?? false;
    const retry = (event.payload?.isRetry as boolean) ?? false;
    const currentDifficulty = (event.payload?.difficulty as string) ?? state.currentDifficulty;

    let updated = state.withAttempt(correct, responseTimeMs, hintUsed, retry);
    updated = updated.withCurrentDifficulty(currentDifficulty);
    if (event.modality) updated = updated.withCurrentModality(event.modality);

    const newMastery = this.masteryCalculation.calculate(updated, event);
    updated = updated.withMastery(newMastery);

    const newConfidence = this.confidenceCalculation.calculate(updated, event);
    updated = updated.withConfidence(newConfidence);

    const decayResult = this.forgettingCurve.calculateDecay(updated, correct);
    updated = updated.withStability(decayResult.updatedStability);
    updated = updated.withForgettingRate(decayResult.updatedForgettingRate);
    updated = updated.withReviewInterval(decayResult.nextReviewIntervalDays);
    updated = updated.withLastReviewedAt(new Date());

    if (!existing) {
      return this.repository.save(updated);
    }
    return this.repository.update(updated);
  }

  private createInitialState(event: LearningEvent): LearningState {
    return LearningState.create({
      id: crypto.randomUUID(),
      childId: event.childId,
      topicId: event.topicId!,
      mastery: 0,
      confidence: 0,
      stability: 0.5,
      forgettingRate: 0.1,
      reviewIntervalDays: 0,
      lastReviewedAt: event.timestamp,
      lastPracticedAt: event.timestamp,
      correctAttempts: 0,
      incorrectAttempts: 0,
      streak: 0,
      totalAttempts: 0,
      averageResponseTimeMs: 0,
      hintUsage: 0,
      retryCount: 0,
      currentDifficulty: 'MEDIUM',
      currentModality: event.modality ?? null,
    });
  }

  private isCorrectEvent(event: LearningEvent): boolean {
    const payloadCorrect = event.payload?.correct;
    if (typeof payloadCorrect === 'boolean') return payloadCorrect;
    return (
      event.eventType === 'ACTIVITY_COMPLETED' ||
      event.eventType === 'TOPIC_COMPLETED' ||
      event.eventType === 'MASTERY_PRACTICE_COMPLETED' ||
      event.eventType === 'REINFORCEMENT_COMPLETED' ||
      event.eventType === 'DAILY_PRACTICE_COMPLETED'
    );
  }
}
