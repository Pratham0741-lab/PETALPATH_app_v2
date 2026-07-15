import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { ProcessingError } from '../../domain/value-objects/processing-error.js';
import { EvidenceValidationService } from './evidence-validation.service.js';
import { EvidenceAggregationService } from './evidence-aggregation.service.js';
import { LearningStateProcessor } from './learning-state-processor.service.js';
import { LearningDebtProcessor } from './learning-debt-processor.service.js';
import { ReinforcementProcessor } from './reinforcement-processor.service.js';
import { ProcessingResultBuilder } from './processing-result-builder.service.js';
import { ProcessingResult } from '../../domain/entities/processing-result.entity.js';

export class EvidenceProcessingPipeline {
  constructor(
    private readonly validator: EvidenceValidationService,
    private readonly aggregator: EvidenceAggregationService,
    private readonly stateProcessor: LearningStateProcessor,
    private readonly debtProcessor: LearningDebtProcessor,
    private readonly reinforcementProcessor: ReinforcementProcessor,
  ) {}

  async processEvent(event: LearningEvent): Promise<ProcessingResult> {
    const builder = this.createBuilder(event);

    try {
      this.validator.validateEvent(event);

      const records = this.aggregator.aggregate(event);
      builder.withRecords(records);

      const [{ state, snapshot }, debtUpdates] = await Promise.all([
        this.stateProcessor.process(event),
        this.debtProcessor.process(event, records),
      ]);
      builder.withPerformanceSnapshot(snapshot);
      builder.withDebtUpdates(debtUpdates);

      const reinforcementUpdates = await this.reinforcementProcessor.process(
        event,
        records,
        state,
      );
      builder.withReinforcementUpdates(reinforcementUpdates);

      return builder.build();
    } catch (error) {
      builder.withError(
        new ProcessingError(
          'PIPELINE_FAILED',
          error instanceof Error ? error.message : 'Evidence processing pipeline failed',
        ),
      );
      return builder.build();
    }
  }

  private createBuilder(event: LearningEvent): ProcessingResultBuilder {
    return new ProcessingResultBuilder().withEventId(event.eventId);
  }
}
