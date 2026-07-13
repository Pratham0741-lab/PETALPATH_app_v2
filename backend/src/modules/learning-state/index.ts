import { StateRepository } from './infrastructure/repositories/state.repository.js';
import { MasteryCalculationService } from './application/services/mastery-calculation.service.js';
import { ConfidenceCalculationService } from './application/services/confidence-calculation.service.js';
import { ForgettingCurveService } from './application/services/forgetting-curve.service.js';
import { LearningStateUpdater } from './application/services/learning-state-updater.service.js';
import { IStateRepository } from './domain/repositories/repository-interfaces.js';

let stateRepository: IStateRepository | null = null;
let masteryCalculationService: MasteryCalculationService | null = null;
let confidenceCalculationService: ConfidenceCalculationService | null = null;
let forgettingCurveService: ForgettingCurveService | null = null;
let learningStateUpdater: LearningStateUpdater | null = null;

export function getStateRepository(): IStateRepository {
  if (!stateRepository) {
    stateRepository = new StateRepository();
  }
  return stateRepository;
}

export function getMasteryCalculationService(): MasteryCalculationService {
  if (!masteryCalculationService) {
    masteryCalculationService = new MasteryCalculationService();
  }
  return masteryCalculationService;
}

export function getConfidenceCalculationService(): ConfidenceCalculationService {
  if (!confidenceCalculationService) {
    confidenceCalculationService = new ConfidenceCalculationService();
  }
  return confidenceCalculationService;
}

export function getForgettingCurveService(): ForgettingCurveService {
  if (!forgettingCurveService) {
    forgettingCurveService = new ForgettingCurveService();
  }
  return forgettingCurveService;
}

export function getLearningStateUpdater(): LearningStateUpdater {
  if (!learningStateUpdater) {
    learningStateUpdater = new LearningStateUpdater(
      getStateRepository(),
      getMasteryCalculationService(),
      getConfidenceCalculationService(),
      getForgettingCurveService(),
    );
  }
  return learningStateUpdater;
}
