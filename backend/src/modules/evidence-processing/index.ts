import { EvidenceValidationService } from './application/services/evidence-validation.service.js';
import { EvidenceAggregationService } from './application/services/evidence-aggregation.service.js';
import { LearningStateProcessor } from './application/services/learning-state-processor.service.js';
import { LearningDebtProcessor } from './application/services/learning-debt-processor.service.js';
import { ReinforcementProcessor } from './application/services/reinforcement-processor.service.js';
import { EvidenceProcessingPipeline } from './application/services/evidence-processing-pipeline.service.js';
import { getLearningStateUpdater } from '../learning-state/index.js';
import { getLearningDebtService } from '../adaptive-planning/index.js';
import { getReinforcementQueueService } from '../adaptive-planning/index.js';

let validator: EvidenceValidationService | null = null;
let aggregator: EvidenceAggregationService | null = null;
let stateProcessor: LearningStateProcessor | null = null;
let debtProcessor: LearningDebtProcessor | null = null;
let reinforcementProcessor: ReinforcementProcessor | null = null;
let pipeline: EvidenceProcessingPipeline | null = null;

export function getEvidenceValidationService(): EvidenceValidationService {
  if (!validator) validator = new EvidenceValidationService();
  return validator;
}

export function getEvidenceAggregationService(): EvidenceAggregationService {
  if (!aggregator) aggregator = new EvidenceAggregationService();
  return aggregator;
}

export function getLearningStateProcessor(): LearningStateProcessor {
  if (!stateProcessor) {
    stateProcessor = new LearningStateProcessor(getLearningStateUpdater());
  }
  return stateProcessor;
}

export function getLearningDebtProcessor(): LearningDebtProcessor {
  if (!debtProcessor) {
    debtProcessor = new LearningDebtProcessor(getLearningDebtService());
  }
  return debtProcessor;
}

export function getReinforcementProcessor(): ReinforcementProcessor {
  if (!reinforcementProcessor) {
    reinforcementProcessor = new ReinforcementProcessor(getReinforcementQueueService());
  }
  return reinforcementProcessor;
}

export function getEvidenceProcessingPipeline(): EvidenceProcessingPipeline {
  if (!pipeline) {
    pipeline = new EvidenceProcessingPipeline(
      getEvidenceValidationService(),
      getEvidenceAggregationService(),
      getLearningStateProcessor(),
      getLearningDebtProcessor(),
      getReinforcementProcessor(),
    );
  }
  return pipeline;
}
