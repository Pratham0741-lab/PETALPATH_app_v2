import { LearningEventType } from '../../../adaptive-learning/domain/value-objects/event-types.js';
import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningState } from '../../domain/entities/learning-state.entity.js';
import { MasteryConfig } from '../../domain/value-objects/calculation-config.js';

const CORRECT_EVENT_TYPES: ReadonlySet<string> = new Set([
  LearningEventType.ACTIVITY_COMPLETED,
  LearningEventType.TOPIC_COMPLETED,
  LearningEventType.MASTERY_PRACTICE_COMPLETED,
  LearningEventType.REINFORCEMENT_COMPLETED,
  LearningEventType.DAILY_PRACTICE_COMPLETED,
  LearningEventType.SPEECH_COMPLETED,
  LearningEventType.WRITING_COMPLETED,
  LearningEventType.VIDEO_COMPLETED,
  LearningEventType.AUDIO_COMPLETED,
  LearningEventType.RECOVERY_COMPLETED,
]);

export class MasteryCalculationService {
  private readonly config: MasteryConfig;

  constructor(config?: MasteryConfig) {
    this.config = config ?? new MasteryConfig();
  }

  calculate(current: LearningState, event: LearningEvent): number {
    const correct = this.isCorrectEvent(event);
    const rawMastery = correct
      ? this.calculateCorrectIncrement(current)
      : this.calculateIncorrectDecrement(current);

    const clamped = Math.max(
      this.config.minValue,
      Math.min(this.config.maxValue, rawMastery),
    );

    return Math.round(clamped * 100) / 100;
  }

  private isCorrectEvent(event: LearningEvent): boolean {
    const payloadCorrect = event.payload?.correct;
    if (typeof payloadCorrect === 'boolean') return payloadCorrect;
    return CORRECT_EVENT_TYPES.has(event.eventType);
  }

  private calculateCorrectIncrement(current: LearningState): number {
    const increment =
      this.config.correctBaseIncrement * (1 - current.mastery / this.config.maxValue);

    const diminishingFactor = Math.max(
      0,
      1 - current.streak / this.config.diminishingReturnsThreshold,
    );

    return current.mastery + increment * diminishingFactor;
  }

  private calculateIncorrectDecrement(current: LearningState): number {
    const decrement =
      this.config.incorrectBaseDecrement * (current.mastery / this.config.maxValue);

    const penaltyFactor =
      1 + current.retryCount / this.config.penaltyAccelerationThreshold;

    return current.mastery - decrement * penaltyFactor;
  }
}
