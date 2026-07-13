import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningState } from '../../domain/entities/learning-state.entity.js';
import { ConfidenceConfig } from '../../domain/value-objects/calculation-config.js';

export class ConfidenceCalculationService {
  private readonly config: ConfidenceConfig;

  constructor(config?: ConfidenceConfig) {
    this.config = config ?? new ConfidenceConfig();
  }

  calculate(previous: LearningState, event: LearningEvent): number {
    const isCorrect = this.isCorrectEvent(event);
    const rawConfidence = isCorrect
      ? this.calculateCorrectConfidence(previous, event)
      : this.calculateIncorrectConfidence(previous, event);

    return Math.max(0, Math.min(this.config.maxConfidence, Math.round(rawConfidence)));
  }

  private isCorrectEvent(event: LearningEvent): boolean {
    const payloadCorrect = event.payload?.correct;
    if (typeof payloadCorrect === 'boolean') return payloadCorrect;
    return (
      event.eventType === 'ACTIVITY_COMPLETED' ||
      event.eventType === 'TOPIC_COMPLETED' ||
      event.eventType === 'MASTERY_PRACTICE_COMPLETED'
    );
  }

  private calculateCorrectConfidence(state: LearningState, event: LearningEvent): number {
    const streakComponent = state.streak * this.config.baseConfidencePerStreak;
    const consistency = this.calculateConsistency(state);
    const recencyWeight = this.config.recentPerformanceWeight;
    const baseWeight = 1 - recencyWeight;

    return (baseWeight * streakComponent) + (recencyWeight * consistency);
  }

  private calculateIncorrectConfidence(state: LearningState, event: LearningEvent): number {
    let penalty = 0;
    if (state.retryCount > 0) penalty += this.config.retryPenalty;
    if ((event.payload?.hintUsed as boolean) ?? false) {
      penalty += this.config.hintPenalty;
    }
    const streakConfidence = state.streak * this.config.baseConfidencePerStreak;
    const rawConfidence = streakConfidence - penalty;
    const consistency = this.calculateConsistency(state);

    return (rawConfidence + consistency) / 2;
  }

  private calculateConsistency(state: LearningState): number {
    const total = state.correctAttempts + state.incorrectAttempts;
    if (total === 0) return 0;
    const accuracyRatio = state.correctAttempts / total;
    return accuracyRatio * this.config.maxConfidence;
  }
}
