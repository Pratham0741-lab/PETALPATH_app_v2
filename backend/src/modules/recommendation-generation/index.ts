import { RecommendationGenerationEngine, ContextLoaders } from './application/services/recommendation-generation-engine.service.js';
import { RoadmapSection } from './domain/entities/recommendation-context.entity.js';
import { DebtInfo, ReinforcementInfo, RecoveryInfo } from '../adaptive-intelligence/domain/entities/decision-context.entity.js';
import { AdaptiveDecision } from '../adaptive-intelligence/domain/entities/adaptive-decision.entity.js';
import { AdaptiveConstraints } from '../adaptive-intelligence/domain/value-objects/adaptive-constraints.js';
import { getStateRepository } from '../learning-state/index.js';
import { getDynamicRoadmapRepository, getLearningDebtService, getReinforcementQueueService, getRecoveryModeService } from '../adaptive-planning/index.js';
import { getAdaptiveIntelligenceEngine } from '../adaptive-intelligence/index.js';

let engine: RecommendationGenerationEngine | null = null;

function createLoaders(): ContextLoaders {
  return {
    async loadRoadmapSections(childId: string): Promise<RoadmapSection[]> {
      const repo = getDynamicRoadmapRepository();
      const roadmap = await repo.findByChildId(childId);
      if (!roadmap) return [];
      const json = roadmap.roadmapJson;
      const sections = json?.sections ?? [];
      return sections.map((s: any, idx: number) => ({
        sectionType: s.sectionType ?? 'UNKNOWN',
        topicId: s.topicId ?? null,
        modality: s.modality ?? 'VIDEO',
        estimatedMinutes: s.estimatedMinutes ?? 5,
        effortLevel: s.effortLevel ?? 1,
        priority: s.priority ?? 50,
        order: s.order ?? idx,
        metadata: s.metadata ?? {},
      }));
    },

    async loadAdaptiveDecision(childId: string, topicId: string): Promise<AdaptiveDecision> {
      const aiEngine = getAdaptiveIntelligenceEngine();
      return aiEngine.evaluate(childId, topicId);
    },

    async loadUnresolvedDebts(childId: string): Promise<DebtInfo[]> {
      const service = getLearningDebtService();
      const debts = await service.getUnresolvedDebtsByChild(childId);
      return debts.map((d: any) => ({
        debtId: d.id,
        topicId: d.topicId,
        debtType: d.debtType,
        severity: d.severity,
        resolved: d.resolved,
      }));
    },

    async loadReinforcementItems(childId: string): Promise<ReinforcementInfo[]> {
      const service = getReinforcementQueueService();
      const items = await service.getActiveQueue(childId);
      return items.map((q: any) => ({
        queueId: q.id,
        topicId: q.topicId,
        status: q.status,
        priority: q.priority,
        nextReviewAt: q.nextReviewAt ?? null,
      }));
    },

    async loadActiveRecovery(childId: string): Promise<RecoveryInfo | null> {
      const service = getRecoveryModeService();
      const recovery = await service.getActiveRecoveryMode(childId);
      if (!recovery) return null;
      return {
        recoveryId: recovery.id,
        status: recovery.status,
        currentTier: recovery.currentTier,
        triggerReason: recovery.triggerReason,
      };
    },

    async loadConstraints(childId: string): Promise<AdaptiveConstraints> {
      return new AdaptiveConstraints({ recoveryModeActive: false });
    },
  };
}

export function getRecommendationGenerationEngine(): RecommendationGenerationEngine {
  if (!engine) {
    engine = new RecommendationGenerationEngine(createLoaders());
  }
  return engine;
}
