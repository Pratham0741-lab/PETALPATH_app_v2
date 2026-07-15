import { DynamicRoadmapRepository } from './infrastructure/repositories/dynamic-roadmap.repository.js';
import { LearningDebtRepository } from './infrastructure/repositories/learning-debt.repository.js';
import { PracticeRepository } from './infrastructure/repositories/practice.repository.js';
import { RecoveryModeRepository } from './infrastructure/repositories/recovery-mode.repository.js';
import { ReinforcementQueueRepository } from './infrastructure/repositories/reinforcement-queue.repository.js';
import { SessionPlanRepository } from './infrastructure/repositories/session-plan.repository.js';
import { SessionBlockRepository } from './infrastructure/repositories/session-block.repository.js';
import { DynamicRoadmapBuilderService } from './application/services/dynamic-roadmap-builder.service.js';
import { LearningDebtService } from './application/services/learning-debt.service.js';
import { ReinforcementQueueService } from './application/services/reinforcement-queue.service.js';
import { RecoveryModeService } from './application/services/recovery-mode.service.js';
import { SessionBuilderService } from './application/services/session-builder.service.js';
import { RecommendationEngine } from './application/services/recommendation-engine.service.js';
import { AdaptivePlanningController } from './api/controllers/adaptive-planning.controller.js';
import { createAdaptivePlanningRoutes } from './api/routes/adaptive-planning.routes.js';
import { TopicStateRepository } from '../intelligence-core/infrastructure/repositories/topic-state.repository.js';
import { KnowledgeStateRepository } from '../intelligence-core/infrastructure/repositories/knowledge-state.repository.js';
import { LearnerStateRepository } from '../learner/repositories/learner-state.repository.js';

let dynamicRoadmapRepo: DynamicRoadmapRepository | null = null;
let learningDebtRepo: LearningDebtRepository | null = null;
let practiceRepo: PracticeRepository | null = null;
let recoveryModeRepo: RecoveryModeRepository | null = null;
let reinforcementQueueRepo: ReinforcementQueueRepository | null = null;
let sessionPlanRepo: SessionPlanRepository | null = null;
let sessionBlockRepo: SessionBlockRepository | null = null;
let topicStateRepo: TopicStateRepository | null = null;
let knowledgeStateRepo: KnowledgeStateRepository | null = null;
let learnerStateRepo: LearnerStateRepository | null = null;

let dynamicRoadmapBuilder: DynamicRoadmapBuilderService | null = null;
let learningDebtService: LearningDebtService | null = null;
let reinforcementQueueService: ReinforcementQueueService | null = null;
let recoveryModeService: RecoveryModeService | null = null;
let sessionBuilder: SessionBuilderService | null = null;
let recommendationEngine: RecommendationEngine | null = null;
let adaptivePlanningController: AdaptivePlanningController | null = null;
let adaptivePlanningRoutes: ReturnType<typeof createAdaptivePlanningRoutes> | null = null;

export function getDynamicRoadmapRepository(): DynamicRoadmapRepository {
  if (!dynamicRoadmapRepo) dynamicRoadmapRepo = new DynamicRoadmapRepository();
  return dynamicRoadmapRepo;
}

export function getLearningDebtRepository(): LearningDebtRepository {
  if (!learningDebtRepo) learningDebtRepo = new LearningDebtRepository();
  return learningDebtRepo;
}

export function getPracticeRepository(): PracticeRepository {
  if (!practiceRepo) practiceRepo = new PracticeRepository();
  return practiceRepo;
}

export function getRecoveryModeRepository(): RecoveryModeRepository {
  if (!recoveryModeRepo) recoveryModeRepo = new RecoveryModeRepository();
  return recoveryModeRepo;
}

export function getReinforcementQueueRepository(): ReinforcementQueueRepository {
  if (!reinforcementQueueRepo) reinforcementQueueRepo = new ReinforcementQueueRepository();
  return reinforcementQueueRepo;
}

export function getSessionPlanRepository(): SessionPlanRepository {
  if (!sessionPlanRepo) sessionPlanRepo = new SessionPlanRepository();
  return sessionPlanRepo;
}

export function getSessionBlockRepository(): SessionBlockRepository {
  if (!sessionBlockRepo) sessionBlockRepo = new SessionBlockRepository();
  return sessionBlockRepo;
}

export function getTopicStateRepository(): TopicStateRepository {
  if (!topicStateRepo) topicStateRepo = new TopicStateRepository();
  return topicStateRepo;
}

export function getKnowledgeStateRepository(): KnowledgeStateRepository {
  if (!knowledgeStateRepo) knowledgeStateRepo = new KnowledgeStateRepository();
  return knowledgeStateRepo;
}

export function getLearnerStateRepository(): LearnerStateRepository {
  if (!learnerStateRepo) learnerStateRepo = new LearnerStateRepository();
  return learnerStateRepo;
}

export function getDynamicRoadmapBuilder(): DynamicRoadmapBuilderService {
  if (!dynamicRoadmapBuilder) {
    dynamicRoadmapBuilder = new DynamicRoadmapBuilderService(
      getDynamicRoadmapRepository(),
      getTopicStateRepository(),
      getKnowledgeStateRepository(),
      getLearningDebtRepository(),
      getReinforcementQueueRepository(),
      getRecoveryModeRepository(),
      getPracticeRepository(),
      getLearnerStateRepository(),
    );
  }
  return dynamicRoadmapBuilder;
}

export function getLearningDebtService(): LearningDebtService {
  if (!learningDebtService) {
    learningDebtService = new LearningDebtService(getLearningDebtRepository());
  }
  return learningDebtService;
}

export function getReinforcementQueueService(): ReinforcementQueueService {
  if (!reinforcementQueueService) {
    reinforcementQueueService = new ReinforcementQueueService(getReinforcementQueueRepository());
  }
  return reinforcementQueueService;
}

export function getRecoveryModeService(): RecoveryModeService {
  if (!recoveryModeService) {
    recoveryModeService = new RecoveryModeService(getRecoveryModeRepository(), getTopicStateRepository());
  }
  return recoveryModeService;
}

export function getSessionBuilder(): SessionBuilderService {
  if (!sessionBuilder) {
    sessionBuilder = new SessionBuilderService(
      getSessionPlanRepository(),
      getSessionBlockRepository(),
    );
  }
  return sessionBuilder;
}

export function getRecommendationEngine(): RecommendationEngine {
  if (!recommendationEngine) {
    recommendationEngine = new RecommendationEngine();
  }
  return recommendationEngine;
}

export function getAdaptivePlanningController(): AdaptivePlanningController {
  if (!adaptivePlanningController) {
    adaptivePlanningController = new AdaptivePlanningController(
      getDynamicRoadmapBuilder(),
      getLearningDebtService(),
      getReinforcementQueueService(),
      getRecoveryModeService(),
      getSessionBuilder(),
      getRecommendationEngine(),
    );
  }
  return adaptivePlanningController;
}

export function getAdaptivePlanningRoutes(): ReturnType<typeof createAdaptivePlanningRoutes> {
  if (!adaptivePlanningRoutes) {
    adaptivePlanningRoutes = createAdaptivePlanningRoutes(getAdaptivePlanningController());
  }
  return adaptivePlanningRoutes;
}