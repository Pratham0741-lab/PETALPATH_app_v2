import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningState } from '../../../learning-state/domain/entities/learning-state.entity.js';
import { ReinforcementQueueService } from '../../../adaptive-planning/application/services/reinforcement-queue.service.js';
import { EvidenceRecord } from '../../domain/entities/evidence-record.entity.js';
import { ReinforcementUpdate } from '../../domain/entities/processing-result.entity.js';
import { EvidenceType } from '../../domain/value-objects/evidence-type.js';
import { ProcessingFailedError } from '../../domain/errors.js';
import { engineConfig } from '../../../../shared/config/engine.config.js';

const THRESHOLDS = engineConfig.mastery.stateThresholds;

export class ReinforcementProcessor {
  constructor(private readonly queueService: ReinforcementQueueService) {}

  async process(
    event: LearningEvent,
    records: EvidenceRecord[],
    state: LearningState,
  ): Promise<ReinforcementUpdate[]> {
    try {
      const updates: ReinforcementUpdate[] = [];

      const completionEvidence = records.find(r => r.evidenceType === EvidenceType.COMPLETION);
      if (!completionEvidence) return updates;

      const correct = completionEvidence.metadata.correct as boolean;

      if (correct && state.mastery < THRESHOLDS.strong) {
        const masteryState = this.toMasteryState(state.mastery);
        const queueItem = await this.queueService.enqueueTopic(
          event.childId,
          event.topicId!,
          masteryState,
          event.modality,
        );

        updates.push({
          topicId: event.topicId!,
          action: 'ENQUEUED',
          priority: queueItem?.priority ?? 0,
        });
      }

      if (correct && state.mastery >= THRESHOLDS.strong) {
        const masteryState = this.toMasteryState(state.mastery);
        try {
          const queueItem = await this.queueService.processReview(
            event.childId,
            event.topicId!,
            true,
            masteryState,
          );

          updates.push({
            topicId: event.topicId!,
            action: 'COMPLETED',
            priority: queueItem?.priority ?? 0,
          });
        } catch {
          updates.push({
            topicId: event.topicId!,
            action: 'NONE',
            priority: 0,
          });
        }
      }

      return updates;
    } catch (error) {
      throw new ProcessingFailedError(
        'ReinforcementProcessor',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private toMasteryState(mastery: number): string {
    if (mastery < THRESHOLDS.learning) return 'NEW';
    if (mastery < THRESHOLDS.weak) return 'LEARNING';
    if (mastery < THRESHOLDS.strong) return 'STRONG';
    return 'MASTERED';
  }
}
