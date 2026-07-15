import { SessionExecutionPlanner, PlannerDependencies } from './application/services/session-execution-planner.service.js';
import { getRecommendationGenerationEngine } from '../recommendation-generation/index.js';
import { getAdaptiveIntelligenceEngine } from '../adaptive-intelligence/index.js';
import { getStateRepository } from '../learning-state/index.js';
import { getLearningDebtService, getReinforcementQueueService, getRecoveryModeService } from '../adaptive-planning/index.js';
import { RecommendationSet } from '../recommendation-generation/domain/entities/recommendation-set.entity.js';
import { AdaptiveDecision } from '../adaptive-intelligence/domain/entities/adaptive-decision.entity.js';
import { AdaptiveConstraints } from '../adaptive-intelligence/domain/value-objects/adaptive-constraints.js';

let planner: SessionExecutionPlanner | null = null;

function createDependencies(): PlannerDependencies {
  return {
    async loadRecommendationSet(childId: string, topicId: string): Promise<RecommendationSet> {
      const engine = getRecommendationGenerationEngine();
      return engine.generate(childId, topicId);
    },

    async loadAdaptiveDecision(childId: string, topicId: string): Promise<AdaptiveDecision> {
      const engine = getAdaptiveIntelligenceEngine();
      return engine.evaluate(childId, topicId);
    },

    async loadConstraints(_childId: string): Promise<AdaptiveConstraints> {
      return new AdaptiveConstraints({});
    },
  };
}

export function getSessionExecutionPlanner(): SessionExecutionPlanner {
  if (!planner) {
    planner = new SessionExecutionPlanner(createDependencies());
  }
  return planner;
}
