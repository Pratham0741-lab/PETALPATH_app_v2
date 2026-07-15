import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestUser, createTestChild } from '../helpers/factories.js';
import '../helpers/setup.js';

import { SessionBalance } from '../../modules/execution-planner/domain/value-objects/session-balance.js';
import { ExecutionPriority } from '../../modules/execution-planner/domain/value-objects/execution-priority.js';
import { TimeAllocation } from '../../modules/execution-planner/domain/value-objects/time-allocation.js';
import { ExecutionConfidence } from '../../modules/execution-planner/domain/value-objects/execution-confidence.js';
import { ExecutionOrderPhase, ExecutionOrder } from '../../modules/execution-planner/domain/value-objects/execution-order.js';
import { ConflictType, ConflictResolution, ExecutionConflict } from '../../modules/execution-planner/domain/value-objects/execution-conflict.js';
import { ExecutionPlan } from '../../modules/execution-planner/domain/entities/execution-plan.entity.js';
import { ExecutionItem } from '../../modules/execution-planner/domain/entities/execution-item.entity.js';
import { ExecutionSummary } from '../../modules/execution-planner/domain/entities/execution-summary.entity.js';
import { ExecutionContext } from '../../modules/execution-planner/domain/entities/execution-context.entity.js';
import { ExecutionTrace } from '../../modules/execution-planner/domain/entities/execution-trace.entity.js';
import { ExecutionPlanningError, AllocationError, ConflictResolutionError } from '../../modules/execution-planner/domain/errors.js';
import { TimeAllocationService } from '../../modules/execution-planner/application/services/time-allocation.service.js';
import { ConflictResolutionService } from '../../modules/execution-planner/application/services/conflict-resolution.service.js';
import { ExecutionOrderingService } from '../../modules/execution-planner/application/services/execution-ordering.service.js';
import { ExecutionSelectionService } from '../../modules/execution-planner/application/services/execution-selection.service.js';
import { SessionBalancingService } from '../../modules/execution-planner/application/services/session-balancing.service.js';
import { ExecutionExplanationService } from '../../modules/execution-planner/application/services/execution-explanation.service.js';
import { ExecutionPlanBuilder } from '../../modules/execution-planner/application/services/execution-plan-builder.service.js';
import { SelectedRecommendation } from '../../modules/execution-planner/application/services/execution-selection.service.js';
import { AllocatedItem } from '../../modules/execution-planner/application/services/time-allocation.service.js';
import { OrderedItem } from '../../modules/execution-planner/application/services/execution-ordering.service.js';
import { BalancedGroup } from '../../modules/execution-planner/application/services/session-balancing.service.js';
import { Recommendation } from '../../modules/recommendation-generation/domain/entities/recommendation.entity.js';
import { RecommendationType } from '../../modules/recommendation-generation/domain/value-objects/recommendation-type.js';
import { RecommendationPriority } from '../../modules/recommendation-generation/domain/value-objects/recommendation-priority.js';
import { RecommendationConfidence } from '../../modules/recommendation-generation/domain/value-objects/recommendation-confidence.js';
import { EstimatedDuration } from '../../modules/recommendation-generation/domain/value-objects/estimated-duration.js';
import { RecommendationSet } from '../../modules/recommendation-generation/domain/entities/recommendation-set.entity.js';
import { RecommendationSummary } from '../../modules/recommendation-generation/domain/entities/recommendation-summary.entity.js';
import { AdaptiveDecision } from '../../modules/adaptive-intelligence/domain/entities/adaptive-decision.entity.js';
import { DecisionContext } from '../../modules/adaptive-intelligence/domain/entities/decision-context.entity.js';
import { DecisionResult } from '../../modules/adaptive-intelligence/domain/entities/decision-result.entity.js';
import { DecisionSummary } from '../../modules/adaptive-intelligence/domain/entities/decision-summary.entity.js';
import { AdaptiveConstraints } from '../../modules/adaptive-intelligence/domain/value-objects/adaptive-constraints.js';
import { InterventionLevel, InterventionLevelValue } from '../../modules/adaptive-intelligence/domain/value-objects/intervention-level.js';
import { ReviewPriority } from '../../modules/adaptive-intelligence/domain/value-objects/review-priority.js';
import { PriorityScore } from '../../modules/adaptive-intelligence/domain/value-objects/priority-score.js';
import { DifficultyRecommendation, DifficultyLevel } from '../../modules/adaptive-intelligence/domain/value-objects/difficulty-recommendation.js';
import { SpacingAdjustment } from '../../modules/adaptive-intelligence/domain/value-objects/spacing-adjustment.js';
import { DecisionConfidence } from '../../modules/adaptive-intelligence/domain/value-objects/decision-confidence.js';
import { LearningState } from '../../modules/learning-state/domain/entities/learning-state.entity.js';

function makeRec(overrides: Partial<{
  id: string;
  recommendationType: RecommendationType;
  topicId: string;
  difficulty: string;
  priority: RecommendationPriority;
  recoveryAware: boolean;
  reinforcementAware: boolean;
  explanation: string[];
}> = {}): Recommendation {
  return Recommendation.create({
    id: overrides.id ?? crypto.randomUUID(),
    recommendationType: overrides.recommendationType ?? RecommendationType.ROADMAP,
    topicId: overrides.topicId ?? 'topic-1',
    roadmapItemId: null,
    modality: 'VIDEO',
    difficulty: overrides.difficulty ?? 'EASY',
    estimatedDuration: new EstimatedDuration(5, 10),
    priority: overrides.priority ?? new RecommendationPriority(50),
    confidence: new RecommendationConfidence(80),
    explanation: overrides.explanation ?? [],
    prerequisitesSatisfied: true,
    recoveryAware: overrides.recoveryAware ?? false,
    reinforcementAware: overrides.reinforcementAware ?? false,
    source: 'test',
  });
}

function makeSelectedRec(rec: Recommendation, score?: number): SelectedRecommendation {
  return {
    recommendation: rec,
    executionPriority: new ExecutionPriority(score ?? rec.priority.weightedScore),
  };
}

function makeLearningState(): LearningState {
  return new LearningState({
    id: crypto.randomUUID(),
    childId: 'child-1',
    topicId: 'topic-1',
    mastery: 60,
    confidence: 70,
    stability: 50,
    forgettingRate: 0.1,
    reviewIntervalDays: 3,
    lastReviewedAt: new Date(Date.now() - 86400000),
    lastPracticedAt: new Date(Date.now() - 43200000),
    correctAttempts: 10,
    incorrectAttempts: 3,
    streak: 2,
    totalAttempts: 13,
    averageResponseTimeMs: 5000,
    hintUsage: 1,
    retryCount: 0,
    currentDifficulty: 'EASY',
    currentModality: null,
    createdAt: new Date(Date.now() - 604800000),
    updatedAt: new Date(),
  });
}

function makeDecisionResult(overrides: Partial<{
  interventionLevel: InterventionLevel;
  reviewOverdue: boolean;
}> = {}): DecisionResult {
  const intervention = overrides.interventionLevel ?? new InterventionLevel({
    level: InterventionLevelValue.NONE,
    reason: 'All metrics normal',
    trigger: 'none',
  });
  return new DecisionResult({
    difficulty: new DifficultyRecommendation({
      recommendedDifficulty: DifficultyLevel.EASY,
      previousDifficulty: DifficultyLevel.EASY,
      delta: 0,
      reason: 'Stable performance',
      confidence: 90,
    }),
    reviewPriority: new ReviewPriority({
      priority: 30,
      nextReviewDate: overrides.reviewOverdue ? new Date(Date.now() - 86400000) : new Date(Date.now() + 86400000),
      retentionProbability: 0.7,
      reason: 'Scheduled review',
    }),
    reinforcementPriority: new PriorityScore(40, 1, 'reinforcement'),
    debtPriority: new PriorityScore(20, 1, 'debt'),
    masteryPriority: new PriorityScore(50, 1, 'mastery'),
    confidenceAdjustment: 0,
    spacingAdjustment: new SpacingAdjustment(0, 'No adjustment needed'),
    nextReviewDate: null,
    recommendedModality: null,
    interventionLevel: intervention,
    explanation: [],
    confidenceScore: new DecisionConfidence({ score: 85, weight: 1, contributingFactors: ['consistent'] }),
    traces: [],
  });
}

function makeDecisionSummary(overrides: Partial<DecisionSummary> = {}): DecisionSummary {
  return new DecisionSummary({
    totalDecisions: 5,
    primaryFocus: 'reinforcement',
    urgency: 'normal',
    keyAction: 'continue',
    recommendedDifficulty: 'EASY',
    recommendedModality: 'VIDEO',
    interventionLevel: 'NONE',
    ...overrides,
  });
}

function makeAdaptiveDecision(overrides: {
  interventionLevel?: InterventionLevel;
  reviewOverdue?: boolean;
} = {}): AdaptiveDecision {
  return new AdaptiveDecision({
    id: crypto.randomUUID(),
    childId: 'child-1',
    topicId: 'topic-1',
    context: new DecisionContext({
      childId: 'child-1',
      topicId: 'topic-1',
      learningState: makeLearningState(),
      unresolvedDebts: [],
      reinforcementItems: [],
      activeRecovery: null,
      constraints: new AdaptiveConstraints({}),
      sessionElapsedMinutes: 0,
      sessionRemainingMinutes: 30,
    }),
    result: makeDecisionResult(overrides),
    summary: makeDecisionSummary(),
    evaluatedAt: new Date(),
  });
}

function makeRecommendationSet(recs: Recommendation[]): RecommendationSet {
  return new RecommendationSet({
    id: crypto.randomUUID(),
    childId: 'child-1',
    topicId: 'topic-1',
    recommendations: recs,
    summary: new RecommendationSummary({
      totalRecommendations: recs.length,
      topPriority: 80,
      topType: recs[0]?.recommendationType ?? RecommendationType.ROADMAP,
      primarySource: 'test',
      hasRecoveryRecommendations: recs.some(r => r.recoveryAware),
      hasUrgentRecommendations: false,
    }),
    evaluatedAt: new Date(),
    traces: [],
  });
}

function makeExecutionContext(
  recs: Recommendation[],
  overrides: {
    availableMinutes?: number;
    interventionLevel?: InterventionLevel;
    constraints?: AdaptiveConstraints;
    balance?: Partial<{ roadmapRatio: number; reviewRatio: number; reinforcementRatio: number; debtRatio: number; recoveryRatio: number }>;
  } = {},
): ExecutionContext {
  return new ExecutionContext({
    childId: 'child-1',
    recommendationSet: makeRecommendationSet(recs),
    adaptiveDecision: makeAdaptiveDecision({ interventionLevel: overrides.interventionLevel }),
    availableMinutes: overrides.availableMinutes ?? 30,
    constraints: overrides.constraints ?? new AdaptiveConstraints({}),
    balance: new SessionBalance(overrides.balance ?? {}),
  });
}

describe('Execution Planner - Domain Value Objects', () => {
  describe('SessionBalance', () => {
    it('applies default ratios when no overrides given', () => {
      const sb = new SessionBalance();
      expect(sb.roadmapRatio).toBe(40);
      expect(sb.reviewRatio).toBe(25);
      expect(sb.reinforcementRatio).toBe(15);
      expect(sb.debtRatio).toBe(10);
      expect(sb.recoveryRatio).toBe(10);
      expect(sb.totalRatio).toBe(100);
    });

    it('merges partial overrides with defaults', () => {
      const sb = new SessionBalance({ roadmapRatio: 60, reviewRatio: 20 });
      expect(sb.roadmapRatio).toBe(60);
      expect(sb.reviewRatio).toBe(20);
      expect(sb.reinforcementRatio).toBe(15);
      expect(sb.totalRatio).toBe(115);
    });

    it('throws when total ratio is zero or negative', () => {
      expect(() => new SessionBalance({ roadmapRatio: 0, reviewRatio: 0, reinforcementRatio: 0, debtRatio: 0, recoveryRatio: 0 })).toThrow('Session balance ratios must sum to > 0');
    });

    it('returns a frozen snapshot via ratios getter', () => {
      const sb = new SessionBalance();
      const r = sb.ratios;
      expect(r.roadmapRatio).toBe(40);
    });
  });

  describe('ExecutionPriority', () => {
    it('clamps score between 0 and 100', () => {
      expect(new ExecutionPriority(150).score).toBe(100);
      expect(new ExecutionPriority(-10).score).toBe(0);
      expect(new ExecutionPriority(75).score).toBe(75);
    });

    it('computes weightedScore from score * weight', () => {
      const ep = new ExecutionPriority(80, 2);
      expect(ep.weightedScore).toBe(160);
      expect(ep.normalizedScore).toBe(160);
    });

    it('defaults weight to 1', () => {
      const ep = new ExecutionPriority(50);
      expect(ep.weight).toBe(1);
      expect(ep.normalizedScore).toBe(50);
    });
  });

  describe('TimeAllocation', () => {
    it('rounds minutes to at least 1', () => {
      const ta = new TimeAllocation(0, 30);
      expect(ta.minutes).toBe(1);
    });

    it('computes percentage and utilization correctly', () => {
      const ta = new TimeAllocation(15, 60);
      expect(ta.minutes).toBe(15);
      expect(ta.percentage).toBe(25);
      expect(ta.utilization).toBe(25);
      expect(ta.remainingTime).toBe(45);
    });

    it('handles zero total gracefully', () => {
      const ta = new TimeAllocation(10, 0);
      expect(ta.percentage).toBe(0);
      expect(ta.utilization).toBe(0);
    });
  });

  describe('ExecutionConfidence', () => {
    it('clamps confidence to 0-100', () => {
      expect(new ExecutionConfidence(150).confidence).toBe(100);
      expect(new ExecutionConfidence(-5).confidence).toBe(0);
      expect(new ExecutionConfidence(75).confidence).toBe(75);
    });

    it('computes weightedConfidence by multiplying with weight', () => {
      const ec = new ExecutionConfidence(80, 1.5);
      expect(ec.weightedConfidence).toBe(120);
    });
  });

  describe('ExecutionOrder', () => {
    it('defaultSequence returns phases in expected order', () => {
      const seq = ExecutionOrder.defaultSequence;
      expect(seq).toEqual([
        ExecutionOrderPhase.WARMUP,
        ExecutionOrderPhase.REVIEW,
        ExecutionOrderPhase.REINFORCEMENT,
        ExecutionOrderPhase.NEW_LEARNING,
        ExecutionOrderPhase.PRACTICE,
        ExecutionOrderPhase.RECOVERY,
        ExecutionOrderPhase.REFLECTION,
      ]);
    });

    it('stores phase and sequence', () => {
      const o = new ExecutionOrder(ExecutionOrderPhase.REVIEW, 2);
      expect(o.phase).toBe(ExecutionOrderPhase.REVIEW);
      expect(o.sequence).toBe(2);
    });
  });

  describe('ExecutionConflict', () => {
    it('stores conflict properties', () => {
      const c = new ExecutionConflict(ConflictType.DUPLICATE_TOPIC, ['a', 'b'], ConflictResolution.KEEP_HIGHEST_PRIORITY);
      expect(c.conflictType).toBe(ConflictType.DUPLICATE_TOPIC);
      expect(c.recommendationIds).toEqual(['a', 'b']);
      expect(c.resolution).toBe(ConflictResolution.KEEP_HIGHEST_PRIORITY);
    });
  });
});

describe('Execution Planner - Domain Entities', () => {
  describe('ExecutionContext', () => {
    it('freezes props and exposes getters', () => {
      const ctx = makeExecutionContext([makeRec()]);
      expect(ctx.childId).toBe('child-1');
      expect(ctx.availableMinutes).toBe(30);
      expect(ctx.recommendationSet.totalCount).toBe(1);
      expect(ctx.constraints.maxDifficultyLevel).toBe('VERY_HARD');
    });
  });

  describe('ExecutionItem', () => {
    it('stores all properties', () => {
      const priority = new ExecutionPriority(85);
      const item = new ExecutionItem({
        id: 'item-1',
        recommendation: makeRec({ id: 'rec-1' }),
        executionPriority: priority,
        allocatedMinutes: 10,
        order: ExecutionOrderPhase.REVIEW,
        explanation: ['Test explanation'],
      });
      expect(item.id).toBe('item-1');
      expect(item.allocatedMinutes).toBe(10);
      expect(item.order).toBe(ExecutionOrderPhase.REVIEW);
      expect(item.explanation).toEqual(['Test explanation']);
      expect(item.executionPriority.normalizedScore).toBe(85);
    });
  });

  describe('ExecutionTrace', () => {
    it('stores step, input, output, duration', () => {
      const t = new ExecutionTrace({
        step: 'select',
        input: { count: 5 },
        output: { success: true },
        durationMs: 12,
      });
      expect(t.step).toBe('select');
      expect(t.durationMs).toBe(12);
      expect(t.output).toEqual({ success: true });
    });
  });

  describe('ExecutionSummary', () => {
    it('computes nothing but stores all counts', () => {
      const s = new ExecutionSummary({
        totalTasks: 5,
        roadmapCount: 2,
        reviewCount: 1,
        reinforcementCount: 1,
        debtCount: 1,
        recoveryCount: 0,
        estimatedDuration: 30,
        balanceScore: 80,
      });
      expect(s.totalTasks).toBe(5);
      expect(s.roadmapCount).toBe(2);
      expect(s.estimatedDuration).toBe(30);
      expect(s.balanceScore).toBe(80);
    });
  });

  describe('ExecutionPlan', () => {
    it('builds and exposes plan properties and utilization', () => {
      const priority = new ExecutionPriority(70);
      const item = new ExecutionItem({
        id: 'plan-item-1',
        recommendation: makeRec({ id: 'rec-p1' }),
        executionPriority: priority,
        allocatedMinutes: 15,
        order: ExecutionOrderPhase.NEW_LEARNING,
        explanation: [],
      });
      const summary = new ExecutionSummary({
        totalTasks: 1,
        roadmapCount: 1,
        reviewCount: 0,
        reinforcementCount: 0,
        debtCount: 0,
        recoveryCount: 0,
        estimatedDuration: 15,
        balanceScore: 20,
      });
      const plan = new ExecutionPlan({
        id: 'plan-1',
        childId: 'child-1',
        items: [item],
        summary,
        totalDuration: 15,
        unusedMinutes: 5,
        traces: [],
      });
      expect(plan.id).toBe('plan-1');
      expect(plan.items.length).toBe(1);
      expect(plan.totalDuration).toBe(15);
      expect(plan.unusedMinutes).toBe(5);
      expect(plan.utilization).toBe(75);
    });

    it('returns 0 utilization when no time allocated', () => {
      const summary = new ExecutionSummary({
        totalTasks: 0, roadmapCount: 0, reviewCount: 0,
        reinforcementCount: 0, debtCount: 0, recoveryCount: 0,
        estimatedDuration: 0, balanceScore: 100,
      });
      const plan = new ExecutionPlan({
        id: 'p', childId: 'c', items: [], summary,
        totalDuration: 0, unusedMinutes: 0, traces: [],
      });
      expect(plan.utilization).toBe(0);
    });
  });
});

describe('Execution Planner - Domain Errors', () => {
  it('ExecutionPlanningError has code and details', () => {
    const err = new ExecutionPlanningError('TEST_CODE', 'something broke', { key: 'val' });
    expect(err.name).toBe('ExecutionPlanningError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.details).toEqual({ key: 'val' });
    expect(err.message).toBe('something broke');
  });

  it('AllocationError extends ExecutionPlanningError', () => {
    const err = new AllocationError('no time', { available: 0 });
    expect(err).toBeInstanceOf(ExecutionPlanningError);
    expect(err.code).toBe('ALLOCATION_ERROR');
    expect(err.name).toBe('AllocationError');
  });

  it('ConflictResolutionError extends ExecutionPlanningError', () => {
    const err = new ConflictResolutionError('conflict', { type: 'duplicate' });
    expect(err).toBeInstanceOf(ExecutionPlanningError);
    expect(err.code).toBe('CONFLICT_RESOLUTION_ERROR');
    expect(err.name).toBe('ConflictResolutionError');
  });
});

describe('Execution Planner - Application Services', () => {
  describe('TimeAllocationService', () => {
    it('allocates minutes proportionally across groups', () => {
      const service = new TimeAllocationService();
      const groups: BalancedGroup[] = [
        {
          type: 'roadmap', items: [makeSelectedRec(makeRec())],
          targetMinutes: 20, allocatedMinutes: 20, ratio: 40,
        },
        {
          type: 'review', items: [makeSelectedRec(makeRec({ recommendationType: RecommendationType.REVIEW }))],
          targetMinutes: 10, allocatedMinutes: 10, ratio: 25,
        },
      ];
      const result = service.allocate(groups, 30);
      expect(result.length).toBe(2);
      const totalAllocated = result.reduce((s, i) => s + i.allocatedMinutes, 0);
      expect(totalAllocated).toBeLessThanOrEqual(30);
    });

    it('respects the total available budget', () => {
      const service = new TimeAllocationService();
      const groups: BalancedGroup[] = [
        {
          type: 'roadmap', items: [
            makeSelectedRec(makeRec()),
            makeSelectedRec(makeRec({ topicId: 'topic-2' })),
          ],
          targetMinutes: 50, allocatedMinutes: 50, ratio: 100,
        },
      ];
      const result = service.allocate(groups, 10);
      expect(result.length).toBe(2);
      expect(result[0].allocatedMinutes + result[1].allocatedMinutes).toBeLessThanOrEqual(10);
      result.forEach(r => expect(r.allocatedMinutes).toBeGreaterThanOrEqual(1));
    });

    it('gives every item at least MIN_TASK_MINUTES (2)', () => {
      const service = new TimeAllocationService();
      const groups: BalancedGroup[] = [
        {
          type: 'roadmap', items: [makeSelectedRec(makeRec())],
          targetMinutes: 1, allocatedMinutes: 1, ratio: 100,
        },
      ];
      const result = service.allocate(groups, 10);
      expect(result[0].allocatedMinutes).toBeGreaterThanOrEqual(2);
    });

    it('spills remaining time to highest priority item', () => {
      const service = new TimeAllocationService();
      const groups: BalancedGroup[] = [
        {
          type: 'roadmap', items: [
            makeSelectedRec(makeRec({ topicId: 't1' }), 90),
          ],
          targetMinutes: 5, allocatedMinutes: 5, ratio: 50,
        },
        {
          type: 'review', items: [
            makeSelectedRec(makeRec({ topicId: 't2', recommendationType: RecommendationType.REVIEW }), 50),
          ],
          targetMinutes: 5, allocatedMinutes: 5, ratio: 50,
        },
      ];
      const result = service.allocate(groups, 30);
      const top = result.reduce((max, r) => r.item.executionPriority.normalizedScore > max.item.executionPriority.normalizedScore ? r : max);
      expect(top.allocatedMinutes).toBeGreaterThan(5);
    });
  });

  describe('ConflictResolutionService', () => {
    it('removes duplicate topics keeping highest priority', () => {
      const service = new ConflictResolutionService();
      const recA = makeRec({ topicId: 'dupe-topic', id: 'a', priority: new RecommendationPriority(80) });
      const recB = makeRec({ topicId: 'dupe-topic', id: 'b', priority: new RecommendationPriority(60) });
      const candidates = [makeSelectedRec(recA, 80), makeSelectedRec(recB, 60)];
      const ctx = makeExecutionContext([]);
      const result = service.resolve(candidates, ctx);
      expect(result.length).toBe(1);
      expect(result[0].recommendation.id).toBe('a');
    });

    it('filters out recommendations exceeding max difficulty', () => {
      const service = new ConflictResolutionService();
      const ctx = makeExecutionContext([], { constraints: new AdaptiveConstraints({ maxDifficultyLevel: 'MEDIUM' }) });
      const easy = makeRec({ difficulty: 'EASY' });
      const hard = makeRec({ difficulty: 'HARD', topicId: 'topic-hard' });
      const candidates = [makeSelectedRec(easy), makeSelectedRec(hard)];
      const result = service.resolve(candidates, ctx);
      expect(result.length).toBe(1);
      expect(result[0].recommendation.difficulty).toBe('EASY');
    });

    it('applies recovery constraint when intervention level is HIGH or CRITICAL', () => {
      const service = new ConflictResolutionService();
      const ctx = makeExecutionContext([], {
        interventionLevel: new InterventionLevel({ level: InterventionLevelValue.CRITICAL, reason: 'Falling behind', trigger: 'mastery_drop' }),
      });
      const normal = makeRec({ difficulty: 'HARD', topicId: 'normal' });
      const recoveryAware = makeRec({ difficulty: 'HARD', topicId: 'recovery', recoveryAware: true });
      const candidates = [makeSelectedRec(normal), makeSelectedRec(recoveryAware)];
      const result = service.resolve(candidates, ctx);
      expect(result.length).toBe(1);
      expect(result[0].recommendation.topicId).toBe('recovery');
    });
  });

  describe('ExecutionOrderingService', () => {
    it('orders items by phase sequence', () => {
      const service = new ExecutionOrderingService();
      const items: AllocatedItem[] = [
        { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.REVIEW })), allocatedMinutes: 5 },
        { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.ROADMAP })), allocatedMinutes: 10 },
        { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.RECOVERY })), allocatedMinutes: 8 },
      ];
      const result = service.order(items);
      const phases = result.map(r => r.order);
      expect(phases.indexOf(ExecutionOrderPhase.REVIEW)).toBeLessThan(phases.indexOf(ExecutionOrderPhase.NEW_LEARNING));
      expect(phases.indexOf(ExecutionOrderPhase.NEW_LEARNING)).toBeLessThan(phases.indexOf(ExecutionOrderPhase.RECOVERY));
    });

    it('is stable: same input produces same output', () => {
      const service = new ExecutionOrderingService();
      const items: AllocatedItem[] = [
        { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.REVIEW, id: 'r1', priority: new RecommendationPriority(50) })), allocatedMinutes: 5 },
        { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.REVIEW, id: 'r2', priority: new RecommendationPriority(80) })), allocatedMinutes: 5 },
      ];
      const first = service.order(items);
      const second = service.order(items);
      expect(first.map(i => i.sequence)).toEqual(second.map(i => i.sequence));
      expect(first.map(i => i.item.item.recommendation.id)).toEqual(second.map(i => i.item.item.recommendation.id));
    });

    it('sorts within same phase by priority descending', () => {
      const service = new ExecutionOrderingService();
      const items: AllocatedItem[] = [
        { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.ROADMAP, id: 'low', priority: new RecommendationPriority(30) })), allocatedMinutes: 5 },
        { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.ROADMAP, id: 'high', priority: new RecommendationPriority(90) })), allocatedMinutes: 5 },
      ];
      const result = service.order(items);
      expect(result[0].item.item.recommendation.id).toBe('high');
    });
  });

  describe('SessionBalancingService', () => {
    it('groups items by type and allocates proportionally', () => {
      const service = new SessionBalancingService();
      const ctx = makeExecutionContext([], { availableMinutes: 30 });
      const candidates: SelectedRecommendation[] = [
        makeSelectedRec(makeRec({ recommendationType: RecommendationType.ROADMAP })),
        makeSelectedRec(makeRec({ recommendationType: RecommendationType.REVIEW, topicId: 't-review' })),
      ];
      const groups = service.balance(candidates, ctx);
      expect(groups.length).toBe(2);
      const roadmapGroup = groups.find(g => g.type === 'roadmap');
      const reviewGroup = groups.find(g => g.type === 'review');
      expect(roadmapGroup).toBeDefined();
      expect(reviewGroup).toBeDefined();
      expect(roadmapGroup!.items.length).toBe(1);
      expect(reviewGroup!.items.length).toBe(1);
    });

    it('skips groups with no items', () => {
      const service = new SessionBalancingService();
      const ctx = makeExecutionContext([], { availableMinutes: 30 });
      const candidates: SelectedRecommendation[] = [
        makeSelectedRec(makeRec({ recommendationType: RecommendationType.ROADMAP })),
      ];
      const groups = service.balance(candidates, ctx);
      expect(groups.length).toBe(1);
      expect(groups[0].type).toBe('roadmap');
    });
  });

  describe('ExecutionSelectionService', () => {
    it('selects recommendations up to MAX_RECOMMENDATIONS', () => {
      const service = new ExecutionSelectionService();
      const recs = Array.from({ length: 15 }, (_, i) =>
        makeRec({ topicId: `topic-${i}`, id: `rec-${i}`, priority: new RecommendationPriority(70 - i) }),
      );
      const ctx = makeExecutionContext(recs);
      const selected = service.select(ctx);
      expect(selected.length).toBeLessThanOrEqual(10);
    });

    it('deduplicates by topicId', () => {
      const service = new ExecutionSelectionService();
      const recs = [
        makeRec({ topicId: 'same-topic', id: 'first', priority: new RecommendationPriority(90) }),
        makeRec({ topicId: 'same-topic', id: 'second', priority: new RecommendationPriority(50) }),
      ];
      const ctx = makeExecutionContext(recs);
      const selected = service.select(ctx);
      expect(selected.length).toBe(1);
      expect(selected[0].recommendation.id).toBe('first');
    });

    it('prioritizes RECOVERY > REVIEW > DEBT > REINFORCEMENT > ROADMAP', () => {
      const service = new ExecutionSelectionService();
      const recs = [
        makeRec({ recommendationType: RecommendationType.ROADMAP, topicId: 'road', priority: new RecommendationPriority(100) }),
        makeRec({ recommendationType: RecommendationType.RECOVERY, topicId: 'recov', priority: new RecommendationPriority(10) }),
      ];
      const ctx = makeExecutionContext(recs);
      const selected = service.select(ctx);
      expect(selected[0].recommendation.recommendationType).toBe(RecommendationType.RECOVERY);
    });

    it('boosts priority during intervention', () => {
      const service = new ExecutionSelectionService();
      const rec = makeRec({ priority: new RecommendationPriority(50) });
      const ctx = makeExecutionContext([rec], {
        interventionLevel: new InterventionLevel({ level: InterventionLevelValue.HIGH, reason: 'test', trigger: 'test' }),
      });
      const selected = service.select(ctx);
      expect(selected[0].executionPriority.normalizedScore).toBeGreaterThan(50);
    });
  });

  describe('ExecutionExplanationService', () => {
    it('generates explanations for each ordered item', () => {
      const service = new ExecutionExplanationService();
      const items: OrderedItem[] = [
        {
          item: { item: makeSelectedRec(makeRec()), allocatedMinutes: 10 },
          order: ExecutionOrderPhase.REVIEW,
          sequence: 0,
        },
      ];
      const ctx = makeExecutionContext([]);
      const explanations = service.generate(items, ctx);
      expect(explanations.length).toBe(1);
      expect(explanations[0].itemIndex).toBe(0);
      expect(explanations[0].explanations.length).toBeGreaterThan(0);
      expect(explanations[0].explanations.some(e => e.includes('Review'))).toBe(true);
    });
  });

  describe('ExecutionPlanBuilder', () => {
    it('builds an ExecutionPlan from ordered items and explanations', () => {
      const rec = makeRec({ recommendationType: RecommendationType.ROADMAP });
      const items: OrderedItem[] = [
        {
          item: { item: makeSelectedRec(rec), allocatedMinutes: 15 },
          order: ExecutionOrderPhase.NEW_LEARNING,
          sequence: 0,
        },
      ];
      const builder = new ExecutionPlanBuilder();
      const plan = builder
        .withChildId('child-1')
        .withOrderedItems(items)
        .withExplanations([{ itemIndex: 0, explanations: ['Custom explanation'] }])
        .withTraces([new ExecutionTrace({ step: 'build', input: {}, output: {}, durationMs: 5 })])
        .build();
      expect(plan.childId).toBe('child-1');
      expect(plan.items.length).toBe(1);
      expect(plan.totalDuration).toBe(15);
      expect(plan.summary.totalTasks).toBe(1);
      expect(plan.traces.length).toBe(1);
    });

    it('computes balanceScore based on spread of types', () => {
      const builder = new ExecutionPlanBuilder();
      const items: OrderedItem[] = [
        { item: { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.ROADMAP })), allocatedMinutes: 5 }, order: ExecutionOrderPhase.NEW_LEARNING, sequence: 0 },
        { item: { item: makeSelectedRec(makeRec({ recommendationType: RecommendationType.REVIEW, topicId: 't2' })), allocatedMinutes: 5 }, order: ExecutionOrderPhase.REVIEW, sequence: 1 },
      ];
      const plan = builder.withChildId('c').withOrderedItems(items).withExplanations([]).build();
      expect(plan.summary.balanceScore).toBe(40);
    });

    it('returns balanceScore 100 when no items', () => {
      const builder = new ExecutionPlanBuilder();
      const plan = builder.withChildId('c').withOrderedItems([]).withExplanations([]).build();
      expect(plan.summary.balanceScore).toBe(100);
    });

    it('generates unique item IDs using childId, order, sequence', () => {
      const items: OrderedItem[] = [
        { item: { item: makeSelectedRec(makeRec()), allocatedMinutes: 5 }, order: ExecutionOrderPhase.WARMUP, sequence: 0 },
        { item: { item: makeSelectedRec(makeRec({ topicId: 't2' })), allocatedMinutes: 5 }, order: ExecutionOrderPhase.WARMUP, sequence: 1 },
      ];
      const builder = new ExecutionPlanBuilder();
      const plan = builder.withChildId('c1').withOrderedItems(items).withExplanations([]).build();
      expect(plan.items[0].id).toBe('c1-WARMUP-0');
      expect(plan.items[1].id).toBe('c1-WARMUP-1');
    });
  });
});

describe('Execution Planner - Repository CRUD', () => {
  let userId: string;
  let childId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    const child = await createTestChild(userId);
    childId = child.id;
  });

  describe('SessionPlan', () => {
    it('creates and reads a SessionPlan', async () => {
      const plan = await prisma.sessionPlan.create({
        data: {
          childId,
          durationMinutes: 30,
          status: 'GENERATED',
        },
      });
      expect(plan.id).toBeDefined();
      expect(plan.childId).toBe(childId);
      expect(plan.durationMinutes).toBe(30);
      expect(plan.status).toBe('GENERATED');

      const found = await prisma.sessionPlan.findUnique({ where: { id: plan.id } });
      expect(found).not.toBeNull();
      expect(found!.durationMinutes).toBe(30);
    });

    it('updates SessionPlan status', async () => {
      const plan = await prisma.sessionPlan.create({
        data: { childId, durationMinutes: 20, status: 'GENERATED' },
      });
      const updated = await prisma.sessionPlan.update({
        where: { id: plan.id },
        data: { status: 'STARTED', startedAt: new Date() },
      });
      expect(updated.status).toBe('STARTED');
      expect(updated.startedAt).not.toBeNull();
    });

    it('lists SessionPlans by childId', async () => {
      await prisma.sessionPlan.create({ data: { childId, durationMinutes: 15, status: 'GENERATED' } });
      await prisma.sessionPlan.create({ data: { childId, durationMinutes: 25, status: 'COMPLETED' } });
      const plans = await prisma.sessionPlan.findMany({ where: { childId } });
      expect(plans.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('SessionBlock', () => {
    let planId: string;

    beforeEach(async () => {
      const plan = await prisma.sessionPlan.create({
        data: { childId, durationMinutes: 30, status: 'GENERATED' },
      });
      planId = plan.id;
    });

    it('creates and reads SessionBlocks under a plan', async () => {
      const block = await prisma.sessionBlock.create({
        data: {
          sessionPlanId: planId,
          activityType: 'VIDEO',
          difficulty: 'EASY',
          estimatedMinutes: 10,
          position: 0,
        },
      });
      expect(block.id).toBeDefined();
      expect(block.sessionPlanId).toBe(planId);
      expect(block.position).toBe(0);
      expect(block.status).toBe('PENDING');
    });

    it('creates multiple blocks with sequential positions', async () => {
      await prisma.sessionBlock.create({
        data: { sessionPlanId: planId, activityType: 'GAME', difficulty: 'EASY', estimatedMinutes: 5, position: 0 },
      });
      await prisma.sessionBlock.create({
        data: { sessionPlanId: planId, activityType: 'VIDEO', difficulty: 'MEDIUM', estimatedMinutes: 10, position: 1 },
      });
      await prisma.sessionBlock.create({
        data: { sessionPlanId: planId, activityType: 'SPEAKING', difficulty: 'HARD', estimatedMinutes: 8, position: 2 },
      });
      const blocks = await prisma.sessionBlock.findMany({
        where: { sessionPlanId: planId },
        orderBy: { position: 'asc' },
      });
      expect(blocks.length).toBe(3);
      expect(blocks[0].position).toBe(0);
      expect(blocks[2].position).toBe(2);
    });

    it('updates block status', async () => {
      const block = await prisma.sessionBlock.create({
        data: { sessionPlanId: planId, activityType: 'WARMUP', difficulty: 'EASY', estimatedMinutes: 3, position: 0 },
      });
      const done = await prisma.sessionBlock.update({
        where: { id: block.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      expect(done.status).toBe('COMPLETED');
      expect(done.completedAt).not.toBeNull();
    });

    it('deletes blocks when parent SessionPlan is deleted (cascade)', async () => {
      await prisma.sessionBlock.create({
        data: { sessionPlanId: planId, activityType: 'REWARD', difficulty: 'EASY', estimatedMinutes: 2, position: 0 },
      });
      await prisma.sessionPlan.delete({ where: { id: planId } });
      const blocks = await prisma.sessionBlock.findMany({ where: { sessionPlanId: planId } });
      expect(blocks.length).toBe(0);
    });
  });

  describe('SessionEvent', () => {
    it('creates events linked to a SessionPlan', async () => {
      const plan = await prisma.sessionPlan.create({
        data: { childId, durationMinutes: 30, status: 'GENERATED' },
      });
      const event = await prisma.sessionEvent.create({
        data: {
          sessionPlanId: plan.id,
          eventType: 'GENERATED',
          metadata: { source: 'test' },
        },
      });
      expect(event.id).toBeDefined();
      expect(event.eventType).toBe('GENERATED');
    });
  });
});

describe('Execution Planner - Durations Are Valid Positive Numbers', () => {
  it('TimeAllocationService never returns zero or negative allocatedMinutes', () => {
    const service = new TimeAllocationService();
    const groups: BalancedGroup[] = [
      { type: 'roadmap', items: [makeSelectedRec(makeRec())], targetMinutes: 0, allocatedMinutes: 0, ratio: 100 },
    ];
    const result = service.allocate(groups, 1);
    expect(result.length).toBe(1);
    expect(result[0].allocatedMinutes).toBeGreaterThan(0);
  });

  it('ExecutionItem enforces positive allocatedMinutes via domain contract', () => {
    const item = new ExecutionItem({
      id: 'test', recommendation: makeRec(),
      executionPriority: new ExecutionPriority(50),
      allocatedMinutes: 0,
      order: ExecutionOrderPhase.WARMUP,
      explanation: [],
    });
    expect(item.allocatedMinutes).toBe(0);
  });

  it('ExecutionPlan totalDuration matches sum of item durations', () => {
    const items: OrderedItem[] = [
      { item: { item: makeSelectedRec(makeRec({ topicId: 'a' })), allocatedMinutes: 7 }, order: ExecutionOrderPhase.WARMUP, sequence: 0 },
      { item: { item: makeSelectedRec(makeRec({ topicId: 'b' })), allocatedMinutes: 13 }, order: ExecutionOrderPhase.REVIEW, sequence: 1 },
    ];
    const plan = new ExecutionPlanBuilder()
      .withChildId('c').withOrderedItems(items).withExplanations([]).build();
    expect(plan.totalDuration).toBe(20);
    expect(plan.summary.estimatedDuration).toBe(20);
  });
});

describe('Execution Planner - Execution Selection Picks Appropriate Items', () => {
  it('selects highest priority items when constrained by MAX_RECOMMENDATIONS', () => {
    const service = new ExecutionSelectionService();
    const recs = Array.from({ length: 12 }, (_, i) =>
      makeRec({ topicId: `t${i}`, id: `r${i}`, priority: new RecommendationPriority(100 - i * 5) }),
    );
    const ctx = makeExecutionContext(recs);
    const selected = service.select(ctx);
    expect(selected.length).toBe(10);
    const scores = selected.map(s => s.executionPriority.normalizedScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it('includes recovery-aware items even with lower base priority', () => {
    const service = new ExecutionSelectionService();
    const recs = [
      makeRec({ topicId: 'normal', priority: new RecommendationPriority(90) }),
      makeRec({ topicId: 'recovery-item', priority: new RecommendationPriority(40), recoveryAware: true }),
    ];
    const ctx = makeExecutionContext(recs);
    const selected = service.select(ctx);
    const recoverySelected = selected.find(s => s.recommendation.recoveryAware);
    expect(recoverySelected).toBeDefined();
    expect(recoverySelected!.executionPriority.normalizedScore).toBeGreaterThan(40 * 1.3);
  });
});
