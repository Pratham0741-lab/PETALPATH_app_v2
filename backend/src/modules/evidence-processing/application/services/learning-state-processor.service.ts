import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningState } from '../../../learning-state/domain/entities/learning-state.entity.js';
import { LearningStateUpdater } from '../../../learning-state/application/services/learning-state-updater.service.js';
import { PerformanceSnapshot } from '../../domain/value-objects/performance-snapshot.js';
import { ProcessingFailedError } from '../../domain/errors.js';

export class LearningStateProcessor {
  constructor(private readonly stateUpdater: LearningStateUpdater) {}

  async process(event: LearningEvent): Promise<{
    state: LearningState;
    snapshot: PerformanceSnapshot;
  }> {
    try {
      const state = await this.stateUpdater.handleEvent(event);

      const snapshot = new PerformanceSnapshot({
        mastery: state.mastery,
        confidence: state.confidence,
        difficulty: state.currentDifficulty,
        currentModality: state.currentModality,
      });

      return { state, snapshot };
    } catch (error) {
      throw new ProcessingFailedError(
        'LearningStateProcessor',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
