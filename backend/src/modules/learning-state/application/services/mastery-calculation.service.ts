import { isCorrectEvent } from '../../../adaptive-learning/domain/value-objects/event-types.js';
import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningState } from '../../domain/entities/learning-state.entity.js';
import { MasteryConfig } from '../../domain/value-objects/calculation-config.js';

export class MasteryCalculationService {
  private readonly config: MasteryConfig;

  constructor(config?: MasteryConfig) {
    this.config = config ?? new MasteryConfig();
  }

  calculate(current: LearningState, event: LearningEvent): number {
    const correct = isCorrectEvent(event.eventType, event.payload?.correct);
    const rawMastery = correct
      ? this.calculateCorrectIncrement(current)
      : this.calculateIncorrectDecrement(current);

    const clamped = Math.max(
      this.config.minValue,
      Math.min(this.config.maxValue, rawMastery),
    );

    return Math.round(clamped * 100) / 100;
  }

  private calculateCorrectIncrement(current: LearningState): number {
    const remaining = this.config.maxValue - current.mastery;
    const increment = Math.min(this.config.correctBaseIncrement, remaining);
    return current.mastery + increment;
  }

  private calculateIncorrectDecrement(current: LearningState): number {
    const decrement =
      this.config.incorrectBaseDecrement * (current.mastery / this.config.maxValue);

    const penaltyFactor =
      1 + current.retryCount / this.config.penaltyAccelerationThreshold;

    return current.mastery - decrement * penaltyFactor;
  }
}
