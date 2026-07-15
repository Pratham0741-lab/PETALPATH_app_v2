import { SessionExecutionPlanner } from '../../../execution-planner/application/services/session-execution-planner.service.js';
import { SessionPlan, SessionStatus } from '../../../adaptive-planning/domain/entities/session-plan.entity.js';
import { SessionBlock, SessionBlockType, SessionBlockStatus } from '../../../adaptive-planning/domain/entities/session-block.entity.js';
import { ActivityType, DifficultyLevel } from '../../../adaptive-planning/domain/value-objects/planning-types.js';
import { ISessionPlanRepository, ISessionBlockRepository } from '../../../adaptive-planning/domain/repositories/repository-interfaces.js';
import { ExecutionPlan } from '../../../execution-planner/domain/entities/execution-plan.entity.js';
import { ExecutionOrderPhase } from '../../../execution-planner/domain/value-objects/execution-order.js';

const EXECUTION_PHASE_TO_BLOCK_TYPE: Record<string, SessionBlockType> = {
  [ExecutionOrderPhase.REVIEW]: SessionBlockType.DAILY_PRACTICE,
  [ExecutionOrderPhase.REINFORCEMENT]: SessionBlockType.REINFORCEMENT,
  [ExecutionOrderPhase.NEW_LEARNING]: SessionBlockType.NEW_LEARNING,
  [ExecutionOrderPhase.PRACTICE]: SessionBlockType.DAILY_PRACTICE,
  [ExecutionOrderPhase.RECOVERY]: SessionBlockType.RECOVERY,
};

const PHASES_TO_SKIP = new Set([
  ExecutionOrderPhase.WARMUP,
  ExecutionOrderPhase.REFLECTION,
]);

export interface AdaptiveSessionMetadata {
  adaptiveDecisionId: string;
  executionPlanId: string;
  recommendationIds: string[];
  generationTimestamp: string;
  estimatedConfidence: number;
  balanceRatios: Record<string, number>;
  traces: number;
  interventionLevel: string;
}

export class AdaptiveSessionBuilderService {
  constructor(
    private readonly planner: SessionExecutionPlanner,
    private readonly sessionPlanRepo: ISessionPlanRepository,
    private readonly sessionBlockRepo: ISessionBlockRepository,
  ) {}

  async buildAdaptiveSession(
    childId: string,
    topicId: string,
    availableMinutes: number,
    balance?: Partial<{
      roadmapRatio: number;
      reviewRatio: number;
      reinforcementRatio: number;
      debtRatio: number;
      recoveryRatio: number;
    }>,
  ): Promise<SessionPlan> {
    const executionPlan = await this.planner.plan(
      childId, topicId, availableMinutes, balance,
    );

    return this.createSessionFromPlan(childId, executionPlan);
  }

  async buildAdaptiveSessionFromPlan(
    childId: string,
    executionPlan: ExecutionPlan,
  ): Promise<SessionPlan> {
    return this.createSessionFromPlan(childId, executionPlan);
  }

  private async createSessionFromPlan(
    childId: string,
    executionPlan: ExecutionPlan,
  ): Promise<SessionPlan> {
    const sessionPlan = SessionPlan.create({
      childId,
      durationMinutes: executionPlan.totalDuration,
      status: SessionStatus.GENERATED,
    });

    const savedPlan = await this.sessionPlanRepo.create(sessionPlan);

    let order = 0;
    for (const item of executionPlan.items) {
      const blockType = EXECUTION_PHASE_TO_BLOCK_TYPE[item.order];
      if (!blockType || PHASES_TO_SKIP.has(item.order)) continue;

      const modality = item.recommendation.modality ?? 'VIDEO';
      const difficulty = item.recommendation.difficulty as DifficultyLevel;
      const activityType = modality as ActivityType;

      const effortLevel = Math.max(1, Math.min(5,
        Math.round(item.executionPriority.normalizedScore / 20),
      ));

      const metadata: Record<string, unknown> = {
        executionItemId: item.id,
        recommendationId: item.recommendation.id,
        recommendationType: item.recommendation.recommendationType,
        source: item.recommendation.source,
        recoveryAware: item.recommendation.recoveryAware,
        reinforcementAware: item.recommendation.reinforcementAware,
        executionPriority: item.executionPriority.normalizedScore,
      };

      const sessionBlock = SessionBlock.create({
        sessionPlanId: savedPlan.id,
        type: blockType,
        topicId: item.recommendation.topicId,
        modality,
        activityType,
        difficulty,
        estimatedMinutes: item.allocatedMinutes,
        effortLevel,
        order: order++,
        isReinforcement: blockType === SessionBlockType.REINFORCEMENT,
        metadata,
        status: SessionBlockStatus.PENDING,
      });

      await this.sessionBlockRepo.create(sessionBlock);
    }

    const updatedPlan = await this.sessionPlanRepo.findById(savedPlan.id);
    return updatedPlan ?? savedPlan;
  }
}
