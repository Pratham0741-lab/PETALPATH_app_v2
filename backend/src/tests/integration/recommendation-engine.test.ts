import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestUser, createTestChild, createTestSubject, createTestSkill, createTestSkillHealth } from '../helpers/factories.js';
import '../helpers/setup.js';

import { RecommendationGenerationEngine, ContextLoaders } from '../../modules/recommendation-generation/application/services/recommendation-generation-engine.service.js';
import { RoadmapRecommendationService } from '../../modules/recommendation-generation/application/services/roadmap-recommendation.service.js';
import { ReviewRecommendationService } from '../../modules/recommendation-generation/application/services/review-recommendation.service.js';
import { ReinforcementRecommendationService } from '../../modules/recommendation-generation/application/services/reinforcement-recommendation.service.js';
import { DebtRecommendationService } from '../../modules/recommendation-generation/application/services/debt-recommendation.service.js';
import { RecoveryRecommendationService } from '../../modules/recommendation-generation/application/services/recovery-recommendation.service.js';
import { RecommendationRankingService } from '../../modules/recommendation-generation/application/services/recommendation-ranking.service.js';
import { RecommendationFilteringService } from '../../modules/recommendation-generation/application/services/recommendation-filtering.service.js';
import { RecommendationBuilder } from '../../modules/recommendation-generation/application/services/recommendation-builder.service.js';
import { Recommendation } from '../../modules/recommendation-generation/domain/entities/recommendation.entity.js';
import { RecommendationSet } from '../../modules/recommendation-generation/domain/entities/recommendation-set.entity.js';
import { RecommendationTrace } from '../../modules/recommendation-generation/domain/entities/recommendation-trace.entity.js';
import { RecommendationSummary } from '../../modules/recommendation-generation/domain/entities/recommendation-summary.entity.js';
import { RecommendationContext, RoadmapSection } from '../../modules/recommendation-generation/domain/entities/recommendation-context.entity.js';
import { RecommendationType } from '../../modules/recommendation-generation/domain/value-objects/recommendation-type.js';
import { RecommendationPriority } from '../../modules/recommendation-generation/domain/value-objects/recommendation-priority.js';
import { RecommendationConfidence } from '../../modules/recommendation-generation/domain/value-objects/recommendation-confidence.js';
import { RecommendationWeight } from '../../modules/recommendation-generation/domain/value-objects/recommendation-weight.js';
import { EstimatedDuration } from '../../modules/recommendation-generation/domain/value-objects/estimated-duration.js';
import { OrderingReason } from '../../modules/recommendation-generation/domain/value-objects/ordering-reason.js';
import { RecommendationReason } from '../../modules/recommendation-generation/domain/value-objects/recommendation-reason.js';
import { RecommendationScore } from '../../modules/recommendation-generation/domain/value-objects/recommendation-score.js';
import { ContextLoadError, RecommendationGenerationError, RecommendationError } from '../../modules/recommendation-generation/domain/errors.js';
import { AdaptiveDecision } from '../../modules/adaptive-intelligence/domain/entities/adaptive-decision.entity.js';
import { DecisionContext, DebtInfo, ReinforcementInfo, RecoveryInfo } from '../../modules/adaptive-intelligence/domain/entities/decision-context.entity.js';
import { DecisionResult } from '../../modules/adaptive-intelligence/domain/entities/decision-result.entity.js';
import { DecisionSummary } from '../../modules/adaptive-intelligence/domain/entities/decision-summary.entity.js';
import { AdaptiveConstraints } from '../../modules/adaptive-intelligence/domain/value-objects/adaptive-constraints.js';
import { DifficultyRecommendation, DifficultyLevel } from '../../modules/adaptive-intelligence/domain/value-objects/difficulty-recommendation.js';
import { ReviewPriority } from '../../modules/adaptive-intelligence/domain/value-objects/review-priority.js';
import { PriorityScore } from '../../modules/adaptive-intelligence/domain/value-objects/priority-score.js';
import { InterventionLevel, InterventionLevelValue } from '../../modules/adaptive-intelligence/domain/value-objects/intervention-level.js';

function makeDecision(props: Partial<{
  difficultyDiff: number;
  difficultyConfidence: number;
  difficultyLevel: DifficultyLevel;
  reviewPriority: number;
  retentionProbability: number;
  isOverdue: boolean;
  reinforcementScore: number;
  debtScore: number;
  masteryScore: number;
  modality: string | null;
  interventionLevel: InterventionLevelValue;
  interventionReason: string;
}> = {}): AdaptiveDecision {
  const decision = new AdaptiveDecision({
    id: crypto.randomUUID(),
    childId: 'test-child',
    topicId: 'test-topic',
    context: new DecisionContext({
      childId: 'test-child',
      topicId: 'test-topic',
      learningState: {} as any,
      unresolvedDebts: [],
      reinforcementItems: [],
      activeRecovery: null,
      constraints: new AdaptiveConstraints({}),
      sessionElapsedMinutes: 0,
      sessionRemainingMinutes: 15,
    }),
    result: new DecisionResult({
      difficulty: new DifficultyRecommendation({
        recommendedDifficulty: props.difficultyLevel ?? DifficultyLevel.MEDIUM,
        previousDifficulty: DifficultyLevel.EASY,
        delta: props.difficultyDiff ?? 0,
        reason: 'test',
        confidence: props.difficultyConfidence ?? 70,
      }),
      reviewPriority: new ReviewPriority({
        priority: props.reviewPriority ?? 50,
        nextReviewDate: props.isOverdue ? new Date(0) : new Date(Date.now() + 86400000),
        retentionProbability: props.retentionProbability ?? 60,
        reason: 'test',
      }),
      reinforcementPriority: new PriorityScore(
        props.reinforcementScore ?? 50,
        1,
        'reinforcement',
      ),
      debtPriority: new PriorityScore(
        props.debtScore ?? 30,
        1,
        'debt',
      ),
      masteryPriority: new PriorityScore(
        props.masteryScore ?? 50,
        1,
        'mastery',
      ),
      confidenceAdjustment: 0,
      spacingAdjustment: null as any,
      nextReviewDate: null,
      recommendedModality: props.modality ?? null,
      interventionLevel: new InterventionLevel({
        level: props.interventionLevel ?? InterventionLevelValue.NONE,
        reason: props.interventionReason ?? 'none',
        trigger: 'test',
      }),
      explanation: [],
      confidenceScore: null as any,
      traces: [],
    }),
    summary: new DecisionSummary({
      totalDecisions: 1,
      primaryFocus: 'test',
      urgency: 'LOW',
      keyAction: 'continue',
      recommendedDifficulty: DifficultyLevel.MEDIUM,
      recommendedModality: null,
      interventionLevel: 'NONE',
    }),
    evaluatedAt: new Date(),
  });
  return decision;
}

function makeContext(overrides: Partial<{
  childId: string;
  topicId: string;
  decision: AdaptiveDecision;
  sections: RoadmapSection[];
  debts: DebtInfo[];
  reinforcement: ReinforcementInfo[];
  recovery: RecoveryInfo | null;
  constraints: AdaptiveConstraints;
}> = {}): RecommendationContext {
  return new RecommendationContext({
    childId: overrides.childId ?? 'test-child',
    topicId: overrides.topicId ?? 'test-topic',
    adaptiveDecision: overrides.decision ?? makeDecision(),
    roadmapSections: overrides.sections ?? [],
    unresolvedDebts: overrides.debts ?? [],
    reinforcementItems: overrides.reinforcement ?? [],
    activeRecovery: overrides.recovery ?? null,
    constraints: overrides.constraints ?? new AdaptiveConstraints({}),
  });
}

function makeRec(props: Partial<{
  type: RecommendationType;
  topicId: string;
  priority: number;
  weight: number;
  confidence: number;
  difficulty: string;
  modality: string | null;
  source: string;
  explanation: string[];
  recoveryAware: boolean;
  reinforcementAware: boolean;
  prereqs: boolean;
  durationMin: number;
  durationMax: number;
}> = {}): Recommendation {
  return Recommendation.create({
    recommendationType: props.type ?? RecommendationType.ROADMAP,
    topicId: props.topicId ?? 'topic-1',
    roadmapItemId: null,
    modality: props.modality ?? null,
    difficulty: props.difficulty ?? 'EASY',
    estimatedDuration: new EstimatedDuration(props.durationMin ?? 5, props.durationMax ?? 10),
    priority: new RecommendationPriority(props.priority ?? 50, props.weight ?? 1),
    confidence: new RecommendationConfidence(props.confidence ?? 70),
    explanation: props.explanation ?? [],
    prerequisitesSatisfied: props.prereqs ?? true,
    recoveryAware: props.recoveryAware ?? false,
    reinforcementAware: props.reinforcementAware ?? false,
    source: props.source ?? 'test',
  });
}

describe('Recommendation Engine — Integration', () => {

  describe('Domain Value Objects', () => {

    describe('RecommendationPriority', () => {
      it('clamps score between 0 and 100', () => {
        expect(new RecommendationPriority(-10, 1).score).toBe(0);
        expect(new RecommendationPriority(150, 1).score).toBe(100);
        expect(new RecommendationPriority(50, 1).score).toBe(50);
      });

      it('computes weightedScore', () => {
        const p = new RecommendationPriority(60, 2);
        expect(p.weightedScore).toBe(120);
      });

      it('defaults weight to 1', () => {
        const p = new RecommendationPriority(75);
        expect(p.weight).toBe(1);
        expect(p.weightedScore).toBe(75);
      });
    });

    describe('RecommendationConfidence', () => {
      it('clamps score between 0 and 100', () => {
        expect(new RecommendationConfidence(-5).score).toBe(0);
        expect(new RecommendationConfidence(120).score).toBe(100);
        expect(new RecommendationConfidence(85).score).toBe(85);
      });

      it('computes weightedScore', () => {
        const c = new RecommendationConfidence(80, 1.5);
        expect(c.weightedScore).toBe(120);
      });
    });

    describe('EstimatedDuration', () => {
      it('ensures minMinutes >= 1', () => {
        expect(new EstimatedDuration(0, 5).minMinutes).toBe(1);
      });

      it('ensures maxMinutes >= minMinutes', () => {
        const d = new EstimatedDuration(10, 5);
        expect(d.maxMinutes).toBe(10);
        expect(d.minMinutes).toBe(10);
      });

      it('computes average and range', () => {
        const d = new EstimatedDuration(5, 10);
        expect(d.average).toBe(7);
        expect(d.range).toBe('5-10');
      });
    });

    describe('RecommendationType enum', () => {
      it('has expected values', () => {
        expect(RecommendationType.ROADMAP).toBe('ROADMAP');
        expect(RecommendationType.REVIEW).toBe('REVIEW');
        expect(RecommendationType.REINFORCEMENT).toBe('REINFORCEMENT');
        expect(RecommendationType.DEBT).toBe('DEBT');
        expect(RecommendationType.RECOVERY).toBe('RECOVERY');
      });
    });

    describe('RecommendationWeight', () => {
      it('stores value and category', () => {
        const w = new RecommendationWeight(1.5, 'recovery');
        expect(w.value).toBe(1.5);
        expect(w.category).toBe('recovery');
      });
    });

    describe('RecommendationReason', () => {
      it('stores reason details', () => {
        const r = new RecommendationReason('WEAK_SKILL', 'Weak skill detected', { skillId: 's1' });
        expect(r.code).toBe('WEAK_SKILL');
        expect(r.message).toBe('Weak skill detected');
        expect(r.details).toEqual({ skillId: 's1' });
      });
    });

    describe('RecommendationScore', () => {
      it('stores total and weighted', () => {
        const s = new RecommendationScore(100, 150);
        expect(s.total).toBe(100);
        expect(s.weighted).toBe(150);
      });
    });

    describe('OrderingReason', () => {
      it('stores type and description', () => {
        const r = new OrderingReason('high_confidence', 'High confidence boost');
        expect(r.type).toBe('high_confidence');
        expect(r.description).toBe('High confidence boost');
      });
    });
  });

  describe('Domain Entities', () => {

    describe('Recommendation', () => {
      it('creates a recommendation with all props', () => {
        const r = makeRec({
          type: RecommendationType.ROADMAP,
          topicId: 'topic-1',
          priority: 80,
          confidence: 90,
          difficulty: 'MEDIUM',
          modality: 'VIDEO',
          source: 'roadmap',
          explanation: ['Test explanation'],
          recoveryAware: true,
          prereqs: true,
        });

        expect(r.recommendationType).toBe(RecommendationType.ROADMAP);
        expect(r.topicId).toBe('topic-1');
        expect(r.priority.score).toBe(80);
        expect(r.confidence.score).toBe(90);
        expect(r.difficulty).toBe('MEDIUM');
        expect(r.modality).toBe('VIDEO');
        expect(r.source).toBe('roadmap');
        expect(r.explanation).toEqual(['Test explanation']);
        expect(r.recoveryAware).toBe(true);
        expect(r.prerequisitesSatisfied).toBe(true);
        expect(r.roadmapItemId).toBeNull();
        expect(r.id).toBeDefined();
      });

      it('generates a unique id when not provided', () => {
        const r1 = makeRec({ topicId: 'a' });
        const r2 = makeRec({ topicId: 'b' });
        expect(r1.id).not.toBe(r2.id);
      });
    });

    describe('RecommendationTrace', () => {
      it('stores step execution info', () => {
        const now = new Date();
        const t = new RecommendationTrace({
          step: 'rank',
          input: { count: 5 },
          output: { result: true },
          timestamp: now,
          durationMs: 10,
        });
        expect(t.step).toBe('rank');
        expect(t.durationMs).toBe(10);
        expect(t.timestamp).toBe(now);
      });
    });

    describe('RecommendationSummary', () => {
      it('builds summary from props', () => {
        const s = new RecommendationSummary({
          totalRecommendations: 3,
          topPriority: 85,
          topType: 'ROADMAP',
          primarySource: 'roadmap',
          hasRecoveryRecommendations: true,
          hasUrgentRecommendations: false,
        });
        expect(s.totalRecommendations).toBe(3);
        expect(s.topPriority).toBe(85);
        expect(s.topType).toBe('ROADMAP');
        expect(s.primarySource).toBe('roadmap');
        expect(s.hasRecoveryRecommendations).toBe(true);
        expect(s.hasUrgentRecommendations).toBe(false);
      });
    });

    describe('RecommendationSet', () => {
      it('contains recommendations and provides helpers', () => {
        const r1 = makeRec({ type: RecommendationType.ROADMAP, topicId: 'a' });
        const r2 = makeRec({ type: RecommendationType.REVIEW, topicId: 'b' });

        const set = new RecommendationSet({
          id: crypto.randomUUID(),
          childId: 'child-1',
          topicId: 'topic-1',
          recommendations: [r1, r2],
          summary: new RecommendationSummary({
            totalRecommendations: 2,
            topPriority: 50,
            topType: 'ROADMAP',
            primarySource: 'test',
            hasRecoveryRecommendations: false,
            hasUrgentRecommendations: false,
          }),
          evaluatedAt: new Date(),
          traces: [],
        });

        expect(set.totalCount).toBe(2);
        expect(set.topRecommendation).toBe(r1);
        expect(set.byType(RecommendationType.ROADMAP)).toHaveLength(1);
        expect(set.byType(RecommendationType.REVIEW)).toHaveLength(1);
      });

      it('topRecommendation returns null when empty', () => {
        const set = new RecommendationSet({
          id: crypto.randomUUID(),
          childId: 'c',
          topicId: 't',
          recommendations: [],
          summary: new RecommendationSummary({
            totalRecommendations: 0,
            topPriority: 0,
            topType: 'none',
            primarySource: 'none',
            hasRecoveryRecommendations: false,
            hasUrgentRecommendations: false,
          }),
          evaluatedAt: new Date(),
          traces: [],
        });
        expect(set.topRecommendation).toBeNull();
      });
    });
  });

  describe('RecommendationContext', () => {
    it('detects recovery mode from activeRecovery', () => {
      const ctxActive = makeContext({
        recovery: { recoveryId: 'r1', status: 'ACTIVE', currentTier: 2, triggerReason: 'regression' },
      });
      expect(ctxActive.isRecoveryActive).toBe(true);

      const ctxNone = makeContext({ recovery: null });
      expect(ctxNone.isRecoveryActive).toBe(false);
    });

    it('exposes all context properties', () => {
      const d = makeDecision({ difficultyLevel: DifficultyLevel.HARD });
      const ctx = makeContext({
        childId: 'child-x',
        topicId: 'topic-y',
        decision: d,
        sections: [{ sectionType: 'NEW_LEARNING', topicId: 't1', modality: 'VIDEO', estimatedMinutes: 10, effortLevel: 2, priority: 80, order: 1, metadata: {} }],
        debts: [{ debtId: 'd1', topicId: 't1', debtType: 'PRACTICE', severity: 0.7, resolved: false }],
        reinforcement: [{ queueId: 'q1', topicId: 't1', status: 'ACTIVE', priority: 60, nextReviewAt: new Date(Date.now() + 86400000) }],
        constraints: new AdaptiveConstraints({ maxDifficultyLevel: 'HARD' }),
      });

      expect(ctx.childId).toBe('child-x');
      expect(ctx.topicId).toBe('topic-y');
      expect(ctx.adaptiveDecision.result.difficulty.recommendedDifficulty).toBe(DifficultyLevel.HARD);
      expect(ctx.roadmapSections).toHaveLength(1);
      expect(ctx.unresolvedDebts).toHaveLength(1);
      expect(ctx.reinforcementItems).toHaveLength(1);
      expect(ctx.constraints.maxDifficultyLevel).toBe('HARD');
    });
  });

  describe('RecommendationBuilder', () => {
    it('builds a RecommendationSet from context and recommendations', () => {
      const ctx = makeContext({ childId: 'child-1', topicId: 'topic-1' });
      const recs = [
        makeRec({ type: RecommendationType.ROADMAP, topicId: 'a', priority: 80 }),
        makeRec({ type: RecommendationType.REVIEW, topicId: 'a', priority: 60 }),
      ];
      const trace = new RecommendationTrace({
        step: 'build', input: {}, output: {}, timestamp: new Date(), durationMs: 0,
      });

      const builder = new RecommendationBuilder();
      const set = builder
        .withContext(ctx)
        .withRecommendations(recs)
        .withTrace(trace)
        .build();

      expect(set.childId).toBe('child-1');
      expect(set.topicId).toBe('topic-1');
      expect(set.totalCount).toBe(2);
      expect(set.traces).toHaveLength(1);
      expect(set.summary.totalRecommendations).toBe(2);
      expect(set.summary.topType).toBe('ROADMAP');
    });

    it('builds empty summary when no recommendations', () => {
      const ctx = makeContext({ childId: 'c', topicId: 't' });
      const set = new RecommendationBuilder()
        .withContext(ctx)
        .withRecommendations([])
        .build();

      expect(set.totalCount).toBe(0);
      expect(set.summary.totalRecommendations).toBe(0);
      expect(set.summary.topType).toBe('none');
      expect(set.summary.primarySource).toBe('none');
    });

    it('marks urgent recommendations when weightedScore >= 70', () => {
      const ctx = makeContext({ topicId: 'urgent-test' });
      const recs = [
        makeRec({ type: RecommendationType.DEBT, topicId: 'd1', priority: 90 }),
      ];
      const set = new RecommendationBuilder()
        .withContext(ctx)
        .withRecommendations(recs)
        .build();

      expect(set.summary.hasUrgentRecommendations).toBe(true);
    });
  });

  describe('RoadmapRecommendationService', () => {
    it('generates roadmap recommendations from sections', () => {
      const decision = makeDecision({ difficultyLevel: DifficultyLevel.EASY, difficultyConfidence: 80 });
      const ctx = makeContext({
        decision,
        sections: [
          { sectionType: 'NEW_LEARNING', topicId: 't1', modality: 'VIDEO', estimatedMinutes: 10, effortLevel: 2, priority: 70, order: 1, metadata: {} },
          { sectionType: 'DAILY_PRACTICE', topicId: 't2', modality: 'GAME', estimatedMinutes: 5, effortLevel: 1, priority: 60, order: 2, metadata: {} },
        ],
      });

      const service = new RoadmapRecommendationService();
      const recs = service.generate(ctx);

      expect(recs).toHaveLength(2);
      expect(recs[0].recommendationType).toBe(RecommendationType.ROADMAP);
      expect(recs[0].topicId).toBe('t1');
      expect(recs[0].modality).toBe('VIDEO');
      expect(recs[0].difficulty).toBe(DifficultyLevel.EASY);
      expect(recs[0].source).toBe('roadmap');
      expect(recs[1].topicId).toBe('t2');
    });

    it('skips REWARD sections', () => {
      const ctx = makeContext({
        sections: [
          { sectionType: 'REWARD', topicId: 'reward-topic', modality: 'VIDEO', estimatedMinutes: 3, effortLevel: 1, priority: 10, order: 1, metadata: {} },
        ],
      });

      const service = new RoadmapRecommendationService();
      const recs = service.generate(ctx);
      expect(recs).toHaveLength(0);
    });

    it('skips sections with null topicId', () => {
      const ctx = makeContext({
        sections: [
          { sectionType: 'NEW_LEARNING', topicId: null, modality: 'VIDEO', estimatedMinutes: 5, effortLevel: 1, priority: 50, order: 1, metadata: {} },
        ],
      });

      const service = new RoadmapRecommendationService();
      const recs = service.generate(ctx);
      expect(recs).toHaveLength(0);
    });

    it('boosts priority for RECOVERY and MASTERY_PRACTICE sections', () => {
      const decision = makeDecision({ masteryScore: 30, difficultyConfidence: 70 });
      const ctx = makeContext({
        decision,
        sections: [
          { sectionType: 'RECOVERY', topicId: 't1', modality: 'VIDEO', estimatedMinutes: 5, effortLevel: 1, priority: 50, order: 1, metadata: {} },
          { sectionType: 'MASTERY_PRACTICE', topicId: 't2', modality: 'VIDEO', estimatedMinutes: 5, effortLevel: 1, priority: 50, order: 2, metadata: {} },
          { sectionType: 'NEW_LEARNING', topicId: 't3', modality: 'VIDEO', estimatedMinutes: 5, effortLevel: 1, priority: 50, order: 3, metadata: {} },
        ],
      });

      const service = new RoadmapRecommendationService();
      const recs = service.generate(ctx);

      const t1 = recs.find(r => r.topicId === 't1')!;
      const t2 = recs.find(r => r.topicId === 't2')!;
      const t3 = recs.find(r => r.topicId === 't3')!;

      expect(t1.priority.score).toBeGreaterThan(t3.priority.score);
      expect(t2.priority.score).toBeGreaterThan(t3.priority.score);
    });
  });

  describe('ReviewRecommendationService', () => {
    it('generates review recommendation when priority >= 20', () => {
      const decision = makeDecision({ reviewPriority: 60, retentionProbability: 40, isOverdue: true });
      const ctx = makeContext({ decision });

      const service = new ReviewRecommendationService();
      const recs = service.generate(ctx);

      expect(recs).toHaveLength(1);
      expect(recs[0].recommendationType).toBe(RecommendationType.REVIEW);
      expect(recs[0].priority.score).toBe(60);
      expect(recs[0].explanation.length).toBeGreaterThan(0);
    });

    it('returns empty when review priority < 20', () => {
      const decision = makeDecision({ reviewPriority: 10 });
      const ctx = makeContext({ decision });

      const service = new ReviewRecommendationService();
      const recs = service.generate(ctx);
      expect(recs).toHaveLength(0);
    });

    it('includes overdue explanation', () => {
      const decision = makeDecision({ reviewPriority: 70, isOverdue: true, retentionProbability: 30 });
      const ctx = makeContext({ decision });

      const service = new ReviewRecommendationService();
      const recs = service.generate(ctx);

      expect(recs[0].explanation.some(e => e.toLowerCase().includes('overdue'))).toBe(true);
    });
  });

  describe('ReinforcementRecommendationService', () => {
    it('generates reinforcement from active queue items', () => {
      const decision = makeDecision({ reinforcementScore: 50 });
      const ctx = makeContext({
        decision,
        reinforcement: [
          { queueId: 'q1', topicId: 'topic-a', status: 'ACTIVE', priority: 70, nextReviewAt: new Date(Date.now() - 86400000) },
          { queueId: 'q2', topicId: 'topic-b', status: 'ACTIVE', priority: 30, nextReviewAt: new Date(Date.now() + 86400000) },
        ],
      });

      const service = new ReinforcementRecommendationService();
      const recs = service.generate(ctx);

      expect(recs.length).toBeGreaterThanOrEqual(1);
      expect(recs[0].recommendationType).toBe(RecommendationType.REINFORCEMENT);
    });

    it('skips non-ACTIVE items', () => {
      const decision = makeDecision({ reinforcementScore: 50 });
      const ctx = makeContext({
        decision,
        reinforcement: [
          { queueId: 'q1', topicId: 'topic-a', status: 'COMPLETED', priority: 70, nextReviewAt: null },
        ],
      });

      const service = new ReinforcementRecommendationService();
      const recs = service.generate(ctx);
      expect(recs).toHaveLength(0);
    });

    it('deduplicates by topic', () => {
      const decision = makeDecision({ reinforcementScore: 50 });
      const ctx = makeContext({
        decision,
        reinforcement: [
          { queueId: 'q1', topicId: 'topic-a', status: 'ACTIVE', priority: 70, nextReviewAt: null },
          { queueId: 'q2', topicId: 'topic-a', status: 'ACTIVE', priority: 60, nextReviewAt: null },
        ],
      });

      const service = new ReinforcementRecommendationService();
      const recs = service.generate(ctx);
      const topicA = recs.filter(r => r.topicId === 'topic-a');
      expect(topicA.length).toBeLessThanOrEqual(1);
    });

    it('returns default recommendation when reinforcement needed but queue empty', () => {
      const decision = makeDecision({ reinforcementScore: 45 });
      const ctx = makeContext({
        decision,
        reinforcement: [],
      });

      const service = new ReinforcementRecommendationService();
      const recs = service.generate(ctx);

      expect(recs).toHaveLength(1);
      expect(recs[0].recommendationType).toBe(RecommendationType.REINFORCEMENT);
      expect(recs[0].topicId).toBe('test-topic');
    });
  });

  describe('DebtRecommendationService', () => {
    it('generates debt recommendations from unresolved debts', () => {
      const decision = makeDecision({ debtScore: 50 });
      const ctx = makeContext({
        decision,
        debts: [
          { debtId: 'd1', topicId: 'topic-1', debtType: 'PRACTICE', severity: 0.8, resolved: false },
          { debtId: 'd2', topicId: 'topic-2', debtType: 'REVIEW', severity: 0.5, resolved: false },
        ],
      });

      const service = new DebtRecommendationService();
      const recs = service.generate(ctx);

      expect(recs).toHaveLength(2);
      expect(recs[0].recommendationType).toBe(RecommendationType.DEBT);
      expect(recs[0].source).toBe('debt');
    });

    it('returns empty when no unresolved debts', () => {
      const ctx = makeContext({ debts: [] });
      const service = new DebtRecommendationService();
      const recs = service.generate(ctx);
      expect(recs).toHaveLength(0);
    });

    it('skips resolved debts', () => {
      const decision = makeDecision({ debtScore: 40 });
      const ctx = makeContext({
        decision,
        debts: [
          { debtId: 'd1', topicId: 'topic-1', debtType: 'PRACTICE', severity: 0.9, resolved: true },
        ],
      });

      const service = new DebtRecommendationService();
      const recs = service.generate(ctx);
      expect(recs).toHaveLength(0);
    });

    it('deduplicates by topic', () => {
      const decision = makeDecision({ debtScore: 40 });
      const ctx = makeContext({
        decision,
        debts: [
          { debtId: 'd1', topicId: 'topic-1', debtType: 'PRACTICE', severity: 0.8, resolved: false },
          { debtId: 'd2', topicId: 'topic-1', debtType: 'REVIEW', severity: 0.6, resolved: false },
        ],
      });

      const service = new DebtRecommendationService();
      const recs = service.generate(ctx);
      const topic1 = recs.filter(r => r.topicId === 'topic-1');
      expect(topic1.length).toBeLessThanOrEqual(1);
    });

    it('severity >= 0.8 yields critical explanation', () => {
      const decision = makeDecision({ debtScore: 60 });
      const ctx = makeContext({
        decision,
        debts: [{ debtId: 'd1', topicId: 't1', debtType: 'PRACTICE', severity: 0.85, resolved: false }],
      });

      const service = new DebtRecommendationService();
      const recs = service.generate(ctx);
      expect(recs[0].explanation.some(e => e.toLowerCase().includes('critical'))).toBe(true);
    });
  });

  describe('RecoveryRecommendationService', () => {
    it('returns empty when recovery is not active', () => {
      const ctx = makeContext({ recovery: null });
      const service = new RecoveryRecommendationService();
      const recs = service.generate(ctx);
      expect(recs).toHaveLength(0);
    });

    it('generates recovery recommendation when active', () => {
      const decision = makeDecision({ modality: 'VIDEO' });
      const ctx = makeContext({
        decision,
        recovery: { recoveryId: 'r1', status: 'ACTIVE', currentTier: 2, triggerReason: 'regression' },
      });

      const service = new RecoveryRecommendationService();
      const recs = service.generate(ctx);

      expect(recs.length).toBeGreaterThanOrEqual(1);
      expect(recs[0].recommendationType).toBe(RecommendationType.RECOVERY);
      expect(recs[0].difficulty).toBe('EASY');
      expect(recs[0].recoveryAware).toBe(true);
    });

    it('adds debt recovery items for high-severity unresolved debts', () => {
      const decision = makeDecision({ modality: null });
      const ctx = makeContext({
        decision,
        recovery: { recoveryId: 'r1', status: 'ACTIVE', currentTier: 1, triggerReason: 'drop' },
        debts: [
          { debtId: 'd1', topicId: 'debt-1', debtType: 'PRACTICE', severity: 0.8, resolved: false },
          { debtId: 'd2', topicId: 'debt-2', debtType: 'REVIEW', severity: 0.3, resolved: false },
          { debtId: 'd3', topicId: 'debt-3', debtType: 'PRACTICE', severity: 0.6, resolved: false },
        ],
      });

      const service = new RecoveryRecommendationService();
      const recs = service.generate(ctx);

      const debtRecs = recs.filter(r => r.explanation.some(e => e.includes('Debt')));
      expect(debtRecs.length).toBeLessThanOrEqual(2);
      expect(debtRecs.every(r => r.difficulty === 'EASY')).toBe(true);
    });

    it('tier >= 4 adds advanced recovery explanation', () => {
      const decision = makeDecision({ modality: null });
      const ctx = makeContext({
        decision,
        recovery: { recoveryId: 'r1', status: 'ACTIVE', currentTier: 5, triggerReason: 'escalation' },
      });

      const service = new RecoveryRecommendationService();
      const recs = service.generate(ctx);

      expect(recs[0].explanation.some(e => e.includes('Advanced recovery tier'))).toBe(true);
    });
  });

  describe('RecommendationRankingService (sorting by priority)', () => {
    it('returns recommendations sorted by final score descending', () => {
      const low = makeRec({ priority: 20, topicId: 'low' });
      const mid = makeRec({ priority: 50, topicId: 'mid' });
      const high = makeRec({ priority: 90, topicId: 'high' });
      const ctx = makeContext();

      const service = new RecommendationRankingService();
      const ranked = service.rank([low, mid, high], ctx);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].topicId).toBe('high');
      expect(ranked[1].topicId).toBe('mid');
      expect(ranked[2].topicId).toBe('low');
    });

    it('recovery type weight boosts recovery recommendations', () => {
      const roadmap = makeRec({ type: RecommendationType.ROADMAP, priority: 80, topicId: 'roadmap' });
      const recovery = makeRec({ type: RecommendationType.RECOVERY, priority: 60, topicId: 'recovery' });
      const ctx = makeContext();

      const service = new RecommendationRankingService();
      const ranked = service.rank([roadmap, recovery], ctx);

      expect(ranked[0].topicId).toBe('recovery');
    });

    it('high confidence recommendations are boosted', () => {
      const lowConf = makeRec({ confidence: 50, priority: 70, topicId: 'low-conf' });
      const highConf = makeRec({ confidence: 90, priority: 65, topicId: 'high-conf' });
      const ctx = makeContext();

      const service = new RecommendationRankingService();
      const ranked = service.rank([lowConf, highConf], ctx);

      expect(ranked[0].topicId).toBe('high-conf');
    });
  });

  describe('RecommendationFilteringService (filtering works correctly)', () => {
    it('removes duplicate type+topic combinations', () => {
      const ctx = makeContext();
      const r1 = makeRec({ type: RecommendationType.ROADMAP, topicId: 'same-topic' });
      const r2 = makeRec({ type: RecommendationType.ROADMAP, topicId: 'same-topic' });
      const r3 = makeRec({ type: RecommendationType.REVIEW, topicId: 'same-topic' });

      const service = new RecommendationFilteringService();
      const filtered = service.filter([r1, r2, r3], ctx);

      expect(filtered).toHaveLength(2);
    });

    it('removes items exceeding max difficulty from constraints', () => {
      const ctx = makeContext({
        constraints: new AdaptiveConstraints({ maxDifficultyLevel: 'EASY' }),
      });
      const easy = makeRec({ difficulty: 'EASY', topicId: 'easy' });
      const hard = makeRec({ difficulty: 'HARD', topicId: 'hard' });

      const service = new RecommendationFilteringService();
      const filtered = service.filter([easy, hard], ctx);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].topicId).toBe('easy');
    });

    it('filters out hard non-recovery items when recovery is active', () => {
      const ctx = makeContext({
        recovery: { recoveryId: 'r1', status: 'ACTIVE', currentTier: 1, triggerReason: 'test' },
        constraints: new AdaptiveConstraints({ maxDifficultyLevel: 'VERY_HARD' }),
      });

      const easyRoadmap = makeRec({ type: RecommendationType.ROADMAP, difficulty: 'EASY', topicId: 'easy' });
      const hardRoadmap = makeRec({ type: RecommendationType.ROADMAP, difficulty: 'HARD', topicId: 'hard' });
      const recoveryRec = makeRec({ type: RecommendationType.RECOVERY, difficulty: 'EASY', topicId: 'recovery' });

      const service = new RecommendationFilteringService();
      const filtered = service.filter([easyRoadmap, hardRoadmap, recoveryRec], ctx);

      expect(filtered).toContainEqual(expect.objectContaining({ topicId: 'easy' }));
      expect(filtered).toContainEqual(expect.objectContaining({ topicId: 'recovery' }));
      expect(filtered).not.toContainEqual(expect.objectContaining({ topicId: 'hard' }));
    });
  });

  describe('Full Engine with mock loaders', () => {
    it('generates recommendations for a child (scenario 1)', async () => {
      const sections: RoadmapSection[] = [
        { sectionType: 'NEW_LEARNING', topicId: 'topic-new', modality: 'VIDEO', estimatedMinutes: 10, effortLevel: 2, priority: 70, order: 1, metadata: {} },
      ];

      const debts: DebtInfo[] = [
        { debtId: 'd1', topicId: 'topic-debt', debtType: 'PRACTICE', severity: 0.8, resolved: false },
      ];

      const loaders: ContextLoaders = {
        loadRoadmapSections: async () => sections,
        loadAdaptiveDecision: async () => makeDecision({
          difficultyLevel: DifficultyLevel.MEDIUM,
          difficultyConfidence: 75,
          reviewPriority: 50,
          retentionProbability: 60,
          reinforcementScore: 40,
          debtScore: 50,
          masteryScore: 40,
          modality: 'VIDEO',
        }),
        loadUnresolvedDebts: async () => debts,
        loadReinforcementItems: async () => [],
        loadActiveRecovery: async () => null,
        loadConstraints: async () => new AdaptiveConstraints({}),
      };

      const engine = new RecommendationGenerationEngine(loaders);
      const result = await engine.generate('child-1', 'topic-main');

      expect(result).toBeInstanceOf(RecommendationSet);
      expect(result.childId).toBe('child-1');
      expect(result.topicId).toBe('topic-main');
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.recommendations[0]).toBeInstanceOf(Recommendation);
    });

    it('recommendations are sorted by priority (scenario 2)', async () => {
      const loaders: ContextLoaders = {
        loadRoadmapSections: async () => [],
        loadAdaptiveDecision: async () => makeDecision({
          difficultyLevel: DifficultyLevel.EASY,
          reviewPriority: 80,
          retentionProbability: 30,
          isOverdue: true,
          reinforcementScore: 60,
          debtScore: 70,
        }),
        loadUnresolvedDebts: async () => [
          { debtId: 'd1', topicId: 'topic-debt', debtType: 'PRACTICE', severity: 0.9, resolved: false },
        ],
        loadReinforcementItems: async () => [],
        loadActiveRecovery: async () => null,
        loadConstraints: async () => new AdaptiveConstraints({}),
      };

      const engine = new RecommendationGenerationEngine(loaders);
      const result = await engine.generate('child-2', 'topic-main');

      expect(result.totalCount).toBeGreaterThan(1);
      for (let i = 1; i < result.recommendations.length; i++) {
        expect(result.recommendations[i - 1].priority.weightedScore)
          .toBeGreaterThanOrEqual(result.recommendations[i].priority.weightedScore);
      }
    });

    it('combined confidence scores are within valid 0-100 range (scenario 7)', async () => {
      const loaders: ContextLoaders = {
        loadRoadmapSections: async () => [
          { sectionType: 'NEW_LEARNING', topicId: 't1', modality: 'VIDEO', estimatedMinutes: 10, effortLevel: 2, priority: 70, order: 1, metadata: {} },
        ],
        loadAdaptiveDecision: async () => makeDecision({
          difficultyConfidence: 90,
          reviewPriority: 50,
          reinforcementScore: 50,
          debtScore: 50,
        }),
        loadUnresolvedDebts: async () => [
          { debtId: 'd1', topicId: 't2', debtType: 'PRACTICE', severity: 0.6, resolved: false },
        ],
        loadReinforcementItems: async () => [
          { queueId: 'q1', topicId: 't3', status: 'ACTIVE', priority: 50, nextReviewAt: new Date(Date.now() + 86400000) },
        ],
        loadActiveRecovery: async () => null,
        loadConstraints: async () => new AdaptiveConstraints({}),
      };

      const engine = new RecommendationGenerationEngine(loaders);
      const result = await engine.generate('child-3', 'topic-main');

      for (const rec of result.recommendations) {
        expect(rec.confidence.score).toBeGreaterThanOrEqual(0);
        expect(rec.confidence.score).toBeLessThanOrEqual(100);
        expect(rec.priority.score).toBeGreaterThanOrEqual(0);
        expect(rec.priority.score).toBeLessThanOrEqual(100);
      }
    });

    it('no evidence → default recommendation generated (scenario 4)', async () => {
      const loaders: ContextLoaders = {
        loadRoadmapSections: async () => [],
        loadAdaptiveDecision: async () => makeDecision({
          difficultyLevel: DifficultyLevel.EASY,
          reviewPriority: 10,
          reinforcementScore: 10,
          debtScore: 10,
          masteryScore: 10,
        }),
        loadUnresolvedDebts: async () => [],
        loadReinforcementItems: async () => [],
        loadActiveRecovery: async () => null,
        loadConstraints: async () => new AdaptiveConstraints({}),
      };

      const engine = new RecommendationGenerationEngine(loaders);
      const result = await engine.generate('child-4', 'topic-main');

      expect(result.totalCount).toBe(0);
      expect(result.summary.totalRecommendations).toBe(0);
      expect(result.summary.topType).toBe('none');
    });

    it('high mastery → fewer review recommendations (scenario 5)', async () => {
      const highReviewDecision = makeDecision({
        reviewPriority: 70,
        retentionProbability: 80,
        isOverdue: false,
      });

      const lowReviewDecision = makeDecision({
        reviewPriority: 10,
        retentionProbability: 95,
        isOverdue: false,
      });

      const ctxHigh = makeContext({ decision: highReviewDecision });
      const ctxLow = makeContext({ decision: lowReviewDecision });

      const service = new ReviewRecommendationService();
      const highRecs = service.generate(ctxHigh);
      const lowRecs = service.generate(ctxLow);

      expect(highRecs).toHaveLength(1);
      expect(lowRecs).toHaveLength(0);
    });

    it('weights are respected in ranking (scenario 8)', async () => {
      const roadmap = makeRec({ type: RecommendationType.ROADMAP, priority: 80, topicId: 'roadmap' });
      const debt = makeRec({ type: RecommendationType.DEBT, priority: 60, topicId: 'debt' });
      const ctx = makeContext();

      const service = new RecommendationRankingService();
      const ranked = service.rank([roadmap, debt], ctx);

      const typeWeightMap: Record<string, number> = {
        DEBT: 1.3,
        ROADMAP: 1.0,
      };

      const roadmapScore = ranked.find(r => r.topicId === 'roadmap')!;
      const debtScore = ranked.find(r => r.topicId === 'debt')!;

      const roadmapRank = ranked.indexOf(roadmapScore);
      const debtRank = ranked.indexOf(debtScore);

      expect(debtRank).toBeLessThan(roadmapRank);
    });
  });

  describe('Error handling', () => {
    it('ContextLoadError when loader fails', async () => {
      const loaders: ContextLoaders = {
        loadRoadmapSections: async () => { throw new Error('DB down'); },
        loadAdaptiveDecision: async () => { throw new Error('DB down'); },
        loadUnresolvedDebts: async () => [],
        loadReinforcementItems: async () => [],
        loadActiveRecovery: async () => null,
        loadConstraints: async () => new AdaptiveConstraints({}),
      };

      const engine = new RecommendationGenerationEngine(loaders);
      await expect(engine.generate('child-err', 'topic-err')).rejects.toThrow(ContextLoadError);
    });

    it('RecommendationGenerationError wraps generation failures', () => {
      const error = new RecommendationGenerationError('rank', 'Sorting failed', { count: 10 });
      expect(error.code).toBe('GENERATION_ERROR');
      expect(error.message).toContain('rank');
      expect(error.message).toContain('Sorting failed');
      expect(error.details).toEqual({ step: 'rank', count: 10 });
    });

    it('RecommendationError base class', () => {
      const error = new RecommendationError('TEST_ERR', 'Test message', { key: 'val' });
      expect(error.code).toBe('TEST_ERR');
      expect(error.details).toEqual({ key: 'val' });
    });
  });

  describe('Database-backed scenario (weak skills generate higher priority)', () => {
    it('weak skill generates higher priority recommendation', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const weakSkill = await createTestSkill(subject.id, { name: 'Weak Skill', difficulty: 1 });
      const strongSkill = await createTestSkill(subject.id, { name: 'Strong Skill', difficulty: 2 });

      await createTestSkillHealth(child.id, weakSkill.id, {
        masteryState: 'WEAK',
        masteryScore: 30,
        knowledgeScore: 25,
        confidenceScore: 20,
      });

      await createTestSkillHealth(child.id, strongSkill.id, {
        masteryState: 'STRONG',
        masteryScore: 85,
        knowledgeScore: 90,
        confidenceScore: 85,
      });

      const sections: RoadmapSection[] = [
        { sectionType: 'NEW_LEARNING', topicId: weakSkill.id, modality: 'VIDEO', estimatedMinutes: 10, effortLevel: 2, priority: 50, order: 1, metadata: {} },
        { sectionType: 'NEW_LEARNING', topicId: strongSkill.id, modality: 'GAME', estimatedMinutes: 8, effortLevel: 1, priority: 50, order: 2, metadata: {} },
      ];

      const loaders: ContextLoaders = {
        loadRoadmapSections: async () => sections,
        loadAdaptiveDecision: async (_childId: string, _topicId: string) => {
          const isWeak = _topicId === weakSkill.id;
          return makeDecision({
            difficultyLevel: isWeak ? DifficultyLevel.EASY : DifficultyLevel.HARD,
            difficultyConfidence: 70,
            masteryScore: isWeak ? 20 : 80,
          });
        },
        loadUnresolvedDebts: async () => [],
        loadReinforcementItems: async () => [],
        loadActiveRecovery: async () => null,
        loadConstraints: async () => new AdaptiveConstraints({}),
      };

      const engine = new RecommendationGenerationEngine(loaders);
      const result = await engine.generate(child.id, weakSkill.id);

      expect(result.totalCount).toBeGreaterThan(0);
    });
  });
});
