import { AdaptiveIntelligenceEngine, ContextLoaders } from './application/services/adaptive-intelligence-engine.service.js';
import { DebtInfo, ReinforcementInfo, RecoveryInfo } from './domain/entities/decision-context.entity.js';
import { AdaptiveConstraints } from './domain/value-objects/adaptive-constraints.js';
import { getStateRepository } from '../learning-state/index.js';
import { getLearningDebtService, getReinforcementQueueService, getRecoveryModeService } from '../adaptive-planning/index.js';

let engine: AdaptiveIntelligenceEngine | null = null;

function createLoaders(): ContextLoaders {
  return {
    async loadLearningState(childId: string, topicId: string): Promise<any> {
      const repo = getStateRepository();
      const state = await repo.findByTopic(childId, topicId);
      return state;
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
      const service = getRecoveryModeService();
      const recovery = await service.getActiveRecoveryMode(childId);
      return new AdaptiveConstraints({
        recoveryModeActive: recovery !== null,
      });
    },
  };
}

export function getAdaptiveIntelligenceEngine(): AdaptiveIntelligenceEngine {
  if (!engine) {
    engine = new AdaptiveIntelligenceEngine(createLoaders());
  }
  return engine;
}
