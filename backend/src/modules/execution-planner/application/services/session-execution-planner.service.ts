import { ExecutionContext } from '../../domain/entities/execution-context.entity.js';
import { ExecutionPlan } from '../../domain/entities/execution-plan.entity.js';
import { ExecutionTrace } from '../../domain/entities/execution-trace.entity.js';
import { SessionBalance } from '../../domain/value-objects/session-balance.js';
import { ExecutionSelectionService } from './execution-selection.service.js';
import { ConflictResolutionService } from './conflict-resolution.service.js';
import { SessionBalancingService } from './session-balancing.service.js';
import { TimeAllocationService } from './time-allocation.service.js';
import { ExecutionOrderingService } from './execution-ordering.service.js';
import { ExecutionExplanationService } from './execution-explanation.service.js';
import { ExecutionPlanBuilder } from './execution-plan-builder.service.js';
import { AllocationError } from '../../domain/errors.js';
import { RecommendationSet } from '../../../recommendation-generation/domain/entities/recommendation-set.entity.js';
import { AdaptiveDecision } from '../../../adaptive-intelligence/domain/entities/adaptive-decision.entity.js';
import { AdaptiveConstraints } from '../../../adaptive-intelligence/domain/value-objects/adaptive-constraints.js';

export interface PlannerDependencies {
  loadRecommendationSet: (childId: string, topicId: string) => Promise<RecommendationSet>;
  loadAdaptiveDecision: (childId: string, topicId: string) => Promise<AdaptiveDecision>;
  loadConstraints: (childId: string) => Promise<AdaptiveConstraints>;
}

export class SessionExecutionPlanner {
  private readonly selectionService: ExecutionSelectionService;
  private readonly conflictService: ConflictResolutionService;
  private readonly balancingService: SessionBalancingService;
  private readonly allocationService: TimeAllocationService;
  private readonly orderingService: ExecutionOrderingService;
  private readonly explanationService: ExecutionExplanationService;

  constructor(
    private readonly deps: PlannerDependencies,
  ) {
    this.selectionService = new ExecutionSelectionService();
    this.conflictService = new ConflictResolutionService();
    this.balancingService = new SessionBalancingService();
    this.allocationService = new TimeAllocationService();
    this.orderingService = new ExecutionOrderingService();
    this.explanationService = new ExecutionExplanationService();
  }

  async plan(
    childId: string,
    topicId: string,
    availableMinutes: number,
    balance?: Partial<{ roadmapRatio: number; reviewRatio: number; reinforcementRatio: number; debtRatio: number; recoveryRatio: number }>,
  ): Promise<ExecutionPlan> {
    const traces: ExecutionTrace[] = [];

    const context = await this.loadContext(
      childId, topicId, availableMinutes, balance, traces,
    );

    try {
      const selected = this.traceStep(traces, 'select', () =>
        this.selectionService.select(context),
      );

      const resolved = this.traceStep(traces, 'resolve_conflicts', () =>
        this.conflictService.resolve(selected, context),
      );

      const balanced = this.traceStep(traces, 'balance', () =>
        this.balancingService.balance(resolved, context),
      );

      const allocated = this.traceStep(traces, 'allocate', () =>
        this.allocationService.allocate(balanced, context.availableMinutes),
      );

      const ordered = this.traceStep(traces, 'order', () =>
        this.orderingService.order(allocated),
      );

      const explanations = this.traceStep(traces, 'explain', () =>
        this.explanationService.generate(ordered, context),
      );

      const plan = new ExecutionPlanBuilder()
        .withChildId(childId)
        .withOrderedItems(ordered)
        .withExplanations(explanations)
        .withTraces(traces)
        .build();

      return plan;
    } catch (error) {
      throw new AllocationError(
        error instanceof Error ? error.message : 'Session planning failed',
      );
    }
  }

  private async loadContext(
    childId: string,
    topicId: string,
    availableMinutes: number,
    balanceInput: any,
    traces: ExecutionTrace[],
  ): Promise<ExecutionContext> {
    const t0 = Date.now();

    const [recSet, decision, constraints] = await Promise.all([
      this.deps.loadRecommendationSet(childId, topicId),
      this.deps.loadAdaptiveDecision(childId, topicId),
      this.deps.loadConstraints(childId),
    ]);

    traces.push(new ExecutionTrace({
      step: 'load_context',
      input: { childId, topicId },
      output: { recommendations: recSet.totalCount },
      durationMs: Date.now() - t0,
    }));

    return new ExecutionContext({
      childId,
      recommendationSet: recSet,
      adaptiveDecision: decision,
      availableMinutes,
      constraints,
      balance: new SessionBalance(balanceInput),
    });
  }

  private traceStep<T>(
    traces: ExecutionTrace[],
    step: string,
    fn: () => T,
  ): T {
    const start = Date.now();
    try {
      const result = fn();
      traces.push(new ExecutionTrace({
        step,
        input: {},
        output: { success: true },
        durationMs: Date.now() - start,
      }));
      return result;
    } catch (error) {
      traces.push(new ExecutionTrace({
        step,
        input: {},
        output: { error: error instanceof Error ? error.message : 'Unknown' },
        durationMs: Date.now() - start,
      }));
      throw error;
    }
  }
}
