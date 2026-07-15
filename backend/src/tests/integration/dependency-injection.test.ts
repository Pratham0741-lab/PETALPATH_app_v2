import { prisma } from '../../config/database.js';
import '../helpers/setup.js';
import app from '../../app.js';
import { rootRouter } from '../../routes/index.js';

import {
  getLearningEventService,
  getLearningEvidenceService,
  getLearningEventController,
  getLearningEventRoutes,
} from '../../modules/adaptive-learning/index.js';

import { getIntelligenceCoreRoutes } from '../../modules/intelligence-core/index.js';

import {
  getDynamicRoadmapRepository,
  getLearningDebtRepository,
  getPracticeRepository,
  getRecoveryModeRepository,
  getReinforcementQueueRepository,
  getSessionPlanRepository,
  getSessionBlockRepository,
  getTopicStateRepository,
  getKnowledgeStateRepository,
  getLearnerStateRepository,
  getDynamicRoadmapBuilder,
  getLearningDebtService,
  getReinforcementQueueService,
  getRecoveryModeService,
  getSessionBuilder,
  getRecommendationEngine,
  getAdaptivePlanningController,
  getAdaptivePlanningRoutes,
} from '../../modules/adaptive-planning/index.js';

import {
  getEvidenceValidationService,
  getEvidenceAggregationService,
  getLearningStateProcessor,
  getLearningDebtProcessor,
  getReinforcementProcessor,
  getEvidenceProcessingPipeline,
} from '../../modules/evidence-processing/index.js';

import {
  getStateRepository,
  getMasteryCalculationService,
  getConfidenceCalculationService,
  getForgettingCurveService,
  getLearningStateUpdater,
} from '../../modules/learning-state/index.js';

import { getRecommendationGenerationEngine } from '../../modules/recommendation-generation/index.js';

import { getSessionExecutionPlanner } from '../../modules/execution-planner/index.js';

import { getAdaptiveSessionBuilder } from '../../modules/adaptive-session-builder/index.js';

import { LearningEventRepository } from '../../modules/adaptive-learning/infrastructure/repositories/learning-event.repository.js';
import { LearningEvidenceRepository } from '../../modules/adaptive-learning/infrastructure/repositories/learning-evidence.repository.js';
import { TopicStateRepository } from '../../modules/intelligence-core/infrastructure/repositories/topic-state.repository.js';
import { KnowledgeStateRepository } from '../../modules/intelligence-core/infrastructure/repositories/knowledge-state.repository.js';
import { DynamicRoadmapRepository } from '../../modules/adaptive-planning/infrastructure/repositories/dynamic-roadmap.repository.js';
import { LearningDebtRepository } from '../../modules/adaptive-planning/infrastructure/repositories/learning-debt.repository.js';
import { PracticeRepository } from '../../modules/adaptive-planning/infrastructure/repositories/practice.repository.js';
import { ReinforcementQueueRepository } from '../../modules/adaptive-planning/infrastructure/repositories/reinforcement-queue.repository.js';
import { SessionPlanRepository } from '../../modules/adaptive-planning/infrastructure/repositories/session-plan.repository.js';
import { SessionBlockRepository } from '../../modules/adaptive-planning/infrastructure/repositories/session-block.repository.js';
import { StateRepository } from '../../modules/learning-state/infrastructure/repositories/state.repository.js';

describe('Dependency Injection - Module Initialization', () => {

  describe('Adaptive Learning Module exports', () => {
    it('should export getLearningEventService as a function', () => {
      expect(typeof getLearningEventService).toBe('function');
    });

    it('should export getLearningEvidenceService as a function', () => {
      expect(typeof getLearningEvidenceService).toBe('function');
    });

    it('should export getLearningEventController as a function', () => {
      expect(typeof getLearningEventController).toBe('function');
    });

    it('should export getLearningEventRoutes as a function', () => {
      expect(typeof getLearningEventRoutes).toBe('function');
    });

    it('should return defined instances from factory functions', () => {
      const eventService = getLearningEventService();
      expect(eventService).toBeDefined();
      expect(eventService).not.toBeNull();

      const evidenceService = getLearningEvidenceService();
      expect(evidenceService).toBeDefined();

      const controller = getLearningEventController();
      expect(controller).toBeDefined();

      const routes = getLearningEventRoutes();
      expect(routes).toBeDefined();
    });

    it('should create a Router from getLearningEventRoutes', () => {
      const routes = getLearningEventRoutes();
      expect(typeof routes).toBe('function');
      expect(typeof routes.use).toBe('function');
      expect(Array.isArray(routes.stack)).toBe(true);
    });
  });

  describe('Intelligence Core Module exports', () => {
    it('should export getIntelligenceCoreRoutes as a function', () => {
      expect(typeof getIntelligenceCoreRoutes).toBe('function');
    });

    it('should return a Router from getIntelligenceCoreRoutes', () => {
      const routes = getIntelligenceCoreRoutes();
      expect(routes).toBeDefined();
      expect(routes).not.toBeNull();
      expect(typeof routes).toBe('function');
      expect(typeof routes.use).toBe('function');
      expect(Array.isArray(routes.stack)).toBe(true);
    });
  });

  describe('Adaptive Planning Module exports', () => {
    it('should export all repository factory functions', () => {
      expect(typeof getDynamicRoadmapRepository).toBe('function');
      expect(typeof getLearningDebtRepository).toBe('function');
      expect(typeof getPracticeRepository).toBe('function');
      expect(typeof getRecoveryModeRepository).toBe('function');
      expect(typeof getReinforcementQueueRepository).toBe('function');
      expect(typeof getSessionPlanRepository).toBe('function');
      expect(typeof getSessionBlockRepository).toBe('function');
      expect(typeof getTopicStateRepository).toBe('function');
      expect(typeof getKnowledgeStateRepository).toBe('function');
      expect(typeof getLearnerStateRepository).toBe('function');
    });

    it('should export all service factory functions', () => {
      expect(typeof getDynamicRoadmapBuilder).toBe('function');
      expect(typeof getLearningDebtService).toBe('function');
      expect(typeof getReinforcementQueueService).toBe('function');
      expect(typeof getRecoveryModeService).toBe('function');
      expect(typeof getSessionBuilder).toBe('function');
      expect(typeof getRecommendationEngine).toBe('function');
      expect(typeof getAdaptivePlanningController).toBe('function');
      expect(typeof getAdaptivePlanningRoutes).toBe('function');
    });

    it('should return defined instances from all adaptive planning factories', () => {
      expect(getDynamicRoadmapRepository()).toBeDefined();
      expect(getLearningDebtRepository()).toBeDefined();
      expect(getPracticeRepository()).toBeDefined();
      expect(getRecoveryModeRepository()).toBeDefined();
      expect(getReinforcementQueueRepository()).toBeDefined();
      expect(getSessionPlanRepository()).toBeDefined();
      expect(getSessionBlockRepository()).toBeDefined();
      expect(getTopicStateRepository()).toBeDefined();
      expect(getKnowledgeStateRepository()).toBeDefined();
      expect(getLearnerStateRepository()).toBeDefined();
      expect(getDynamicRoadmapBuilder()).toBeDefined();
      expect(getLearningDebtService()).toBeDefined();
      expect(getReinforcementQueueService()).toBeDefined();
      expect(getRecoveryModeService()).toBeDefined();
      expect(getSessionBuilder()).toBeDefined();
      expect(getRecommendationEngine()).toBeDefined();
      expect(getAdaptivePlanningController()).toBeDefined();
      expect(getAdaptivePlanningRoutes()).toBeDefined();
    });

    it('should create a Router from getAdaptivePlanningRoutes', () => {
      const routes = getAdaptivePlanningRoutes();
      expect(typeof routes).toBe('function');
      expect(typeof routes.use).toBe('function');
      expect(Array.isArray(routes.stack)).toBe(true);
    });
  });

  describe('Evidence Processing Module exports', () => {
    it('should export all factory functions', () => {
      expect(typeof getEvidenceValidationService).toBe('function');
      expect(typeof getEvidenceAggregationService).toBe('function');
      expect(typeof getLearningStateProcessor).toBe('function');
      expect(typeof getLearningDebtProcessor).toBe('function');
      expect(typeof getReinforcementProcessor).toBe('function');
      expect(typeof getEvidenceProcessingPipeline).toBe('function');
    });

    it('should return defined instances from all evidence processing factories', () => {
      expect(getEvidenceValidationService()).toBeDefined();
      expect(getEvidenceAggregationService()).toBeDefined();
      expect(getLearningStateProcessor()).toBeDefined();
      expect(getLearningDebtProcessor()).toBeDefined();
      expect(getReinforcementProcessor()).toBeDefined();
      expect(getEvidenceProcessingPipeline()).toBeDefined();
    });
  });

  describe('Learning State Module exports', () => {
    it('should export all factory functions', () => {
      expect(typeof getStateRepository).toBe('function');
      expect(typeof getMasteryCalculationService).toBe('function');
      expect(typeof getConfidenceCalculationService).toBe('function');
      expect(typeof getForgettingCurveService).toBe('function');
      expect(typeof getLearningStateUpdater).toBe('function');
    });

    it('should return defined instances from all learning state factories', () => {
      expect(getStateRepository()).toBeDefined();
      expect(getMasteryCalculationService()).toBeDefined();
      expect(getConfidenceCalculationService()).toBeDefined();
      expect(getForgettingCurveService()).toBeDefined();
      expect(getLearningStateUpdater()).toBeDefined();
    });
  });

  describe('Recommendation Generation Module exports', () => {
    it('should export getRecommendationGenerationEngine as a function', () => {
      expect(typeof getRecommendationGenerationEngine).toBe('function');
    });

    it('should return defined instance from factory', () => {
      const engine = getRecommendationGenerationEngine();
      expect(engine).toBeDefined();
      expect(engine).not.toBeNull();
    });
  });

  describe('Execution Planner Module exports', () => {
    it('should export getSessionExecutionPlanner as a function', () => {
      expect(typeof getSessionExecutionPlanner).toBe('function');
    });

    it('should return defined instance from factory', () => {
      const planner = getSessionExecutionPlanner();
      expect(planner).toBeDefined();
      expect(planner).not.toBeNull();
    });
  });

  describe('Adaptive Session Builder Module exports', () => {
    it('should export getAdaptiveSessionBuilder as a function', () => {
      expect(typeof getAdaptiveSessionBuilder).toBe('function');
    });

    it('should return defined instance from factory', () => {
      const builder = getAdaptiveSessionBuilder();
      expect(builder).toBeDefined();
      expect(builder).not.toBeNull();
    });
  });

  describe('Singleton consistency', () => {
    it('should return the same instance on repeated calls to getLearningEventService', () => {
      const a = getLearningEventService();
      const b = getLearningEventService();
      expect(a).toBe(b);
    });

    it('should return the same instance on repeated calls to getLearningStateUpdater', () => {
      const a = getLearningStateUpdater();
      const b = getLearningStateUpdater();
      expect(a).toBe(b);
    });

    it('should return the same instance on repeated calls to getSessionExecutionPlanner', () => {
      const a = getSessionExecutionPlanner();
      const b = getSessionExecutionPlanner();
      expect(a).toBe(b);
    });

    it('should return the same instance on repeated calls to getAdaptiveSessionBuilder', () => {
      const a = getAdaptiveSessionBuilder();
      const b = getAdaptiveSessionBuilder();
      expect(a).toBe(b);
    });

    it('should return the same instance on repeated calls to getRecoveryModeService', () => {
      const a = getRecoveryModeService();
      const b = getRecoveryModeService();
      expect(a).toBe(b);
    });

    it('should return the same instance on repeated calls to getEvidenceProcessingPipeline', () => {
      const a = getEvidenceProcessingPipeline();
      const b = getEvidenceProcessingPipeline();
      expect(a).toBe(b);
    });
  });

  describe('App and Router wiring', () => {
    it('should export a defined express app', () => {
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
    });

    it('should export a defined rootRouter', () => {
      expect(rootRouter).toBeDefined();
      expect(typeof rootRouter).toBe('function');
      expect(typeof rootRouter.use).toBe('function');
      expect(Array.isArray(rootRouter.stack)).toBe(true);
    });

    it('should have routes mounted on rootRouter', () => {
      const stack = rootRouter.stack;
      expect(stack).toBeDefined();
      expect(Array.isArray(stack)).toBe(true);
      expect(stack.length).toBeGreaterThan(0);
    });

    it('should have adaptive learning routes mounted at /v1/learning-events', () => {
      const layer = rootRouter.stack.find(
        (l: any) => l.route?.path === '/v1/learning-events' || l.regexp?.toString().includes('learning-events')
      );
      expect(layer).toBeDefined();
    });

    it('should have intelligence core routes mounted at /v1/intelligence-core', () => {
      const layer = rootRouter.stack.find(
        (l: any) => l.regexp?.toString().includes('intelligence-core')
      );
      expect(layer).toBeDefined();
    });

    it('should have adaptive planning routes mounted at /v1/adaptive-planning', () => {
      const layer = rootRouter.stack.find(
        (l: any) => l.regexp?.toString().includes('adaptive-planning')
      );
      expect(layer).toBeDefined();
    });
  });

  describe('Repository direct instantiation', () => {
    it('should instantiate LearningEventRepository with defined methods', () => {
      const repo = new LearningEventRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.findByChildId).toBe('function');
    });

    it('should instantiate LearningEvidenceRepository with defined methods', () => {
      const repo = new LearningEvidenceRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findByEventId).toBe('function');
      expect(typeof repo.findByChildId).toBe('function');
    });

    it('should instantiate TopicStateRepository with defined methods', () => {
      const repo = new TopicStateRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.findByChildId).toBe('function');
    });

    it('should instantiate KnowledgeStateRepository with defined methods', () => {
      const repo = new KnowledgeStateRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findByChildAndTopic).toBe('function');
    });

    it('should instantiate DynamicRoadmapRepository with defined methods', () => {
      const repo = new DynamicRoadmapRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findByChildId).toBe('function');
      expect(typeof repo.update).toBe('function');
    });

    it('should instantiate LearningDebtRepository with defined methods', () => {
      const repo = new LearningDebtRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findByChildId).toBe('function');
      expect(typeof repo.resolve).toBe('function');
    });

    it('should instantiate PracticeRepository with defined methods', () => {
      const repo = new PracticeRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.findByChildId).toBe('function');
      expect(typeof repo.update).toBe('function');
    });

    it('should instantiate ReinforcementQueueRepository with defined methods', () => {
      const repo = new ReinforcementQueueRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findByChildAndTopic).toBe('function');
      expect(typeof repo.update).toBe('function');
    });

    it('should instantiate SessionPlanRepository with defined methods', () => {
      const repo = new SessionPlanRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.update).toBe('function');
    });

    it('should instantiate SessionBlockRepository with defined methods', () => {
      const repo = new SessionBlockRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.create).toBe('function');
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.findBySessionPlanId).toBe('function');
    });

    it('should instantiate StateRepository with defined methods', () => {
      const repo = new StateRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.save).toBe('function');
      expect(typeof repo.findByChildId).toBe('function');
      expect(typeof repo.findByTopic).toBe('function');
    });
  });

  describe('No null/undefined exports', () => {
    it('should have all adaptive-learning exports non-null', () => {
      [
        getLearningEventService,
        getLearningEvidenceService,
        getLearningEventController,
        getLearningEventRoutes,
      ].forEach(fn => {
        expect(fn).toBeDefined();
        expect(fn).not.toBeNull();
      });
    });

    it('should have all adaptive-planning exports non-null', () => {
      [
        getDynamicRoadmapRepository,
        getLearningDebtRepository,
        getPracticeRepository,
        getRecoveryModeRepository,
        getReinforcementQueueRepository,
        getSessionPlanRepository,
        getSessionBlockRepository,
        getTopicStateRepository,
        getKnowledgeStateRepository,
        getLearnerStateRepository,
        getDynamicRoadmapBuilder,
        getLearningDebtService,
        getReinforcementQueueService,
        getRecoveryModeService,
        getSessionBuilder,
        getRecommendationEngine,
        getAdaptivePlanningController,
        getAdaptivePlanningRoutes,
      ].forEach(fn => {
        expect(fn).toBeDefined();
        expect(fn).not.toBeNull();
      });
    });

    it('should have all evidence-processing exports non-null', () => {
      [
        getEvidenceValidationService,
        getEvidenceAggregationService,
        getLearningStateProcessor,
        getLearningDebtProcessor,
        getReinforcementProcessor,
        getEvidenceProcessingPipeline,
      ].forEach(fn => {
        expect(fn).toBeDefined();
        expect(fn).not.toBeNull();
      });
    });

    it('should have all learning-state exports non-null', () => {
      [
        getStateRepository,
        getMasteryCalculationService,
        getConfidenceCalculationService,
        getForgettingCurveService,
        getLearningStateUpdater,
      ].forEach(fn => {
        expect(fn).toBeDefined();
        expect(fn).not.toBeNull();
      });
    });

    it('should have non-null remaining module exports', () => {
      expect(getRecommendationGenerationEngine).toBeDefined();
      expect(getSessionExecutionPlanner).toBeDefined();
      expect(getAdaptiveSessionBuilder).toBeDefined();
    });
  });
});
