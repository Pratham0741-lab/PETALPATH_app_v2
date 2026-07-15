import { RecommendationContext, RoadmapSection } from '../../domain/entities/recommendation-context.entity.js';
import { RecommendationSet } from '../../domain/entities/recommendation-set.entity.js';
import { RecommendationTrace } from '../../domain/entities/recommendation-trace.entity.js';
import { AdaptiveDecision } from '../../../adaptive-intelligence/domain/entities/adaptive-decision.entity.js';
import { AdaptiveConstraints } from '../../../adaptive-intelligence/domain/value-objects/adaptive-constraints.js';
import { DebtInfo, ReinforcementInfo, RecoveryInfo } from '../../../adaptive-intelligence/domain/entities/decision-context.entity.js';
import { RoadmapRecommendationService } from './roadmap-recommendation.service.js';
import { ReviewRecommendationService } from './review-recommendation.service.js';
import { ReinforcementRecommendationService } from './reinforcement-recommendation.service.js';
import { DebtRecommendationService } from './debt-recommendation.service.js';
import { RecoveryRecommendationService } from './recovery-recommendation.service.js';
import { RecommendationRankingService } from './recommendation-ranking.service.js';
import { RecommendationFilteringService } from './recommendation-filtering.service.js';
import { RecommendationExplanationService } from './recommendation-explanation.service.js';
import { RecommendationBuilder } from './recommendation-builder.service.js';
import { ContextLoadError, RecommendationGenerationError } from '../../domain/errors.js';

export interface ContextLoaders {
  loadRoadmapSections: (childId: string) => Promise<RoadmapSection[]>;
  loadAdaptiveDecision: (childId: string, topicId: string) => Promise<AdaptiveDecision>;
  loadUnresolvedDebts: (childId: string) => Promise<DebtInfo[]>;
  loadReinforcementItems: (childId: string) => Promise<ReinforcementInfo[]>;
  loadActiveRecovery: (childId: string) => Promise<RecoveryInfo | null>;
  loadConstraints: (childId: string) => Promise<AdaptiveConstraints>;
}

export class RecommendationGenerationEngine {
  private readonly roadmapService: RoadmapRecommendationService;
  private readonly reviewService: ReviewRecommendationService;
  private readonly reinforcementService: ReinforcementRecommendationService;
  private readonly debtService: DebtRecommendationService;
  private readonly recoveryService: RecoveryRecommendationService;
  private readonly rankingService: RecommendationRankingService;
  private readonly filteringService: RecommendationFilteringService;
  private readonly explanationService: RecommendationExplanationService;

  constructor(
    private readonly loaders: ContextLoaders,
  ) {
    this.roadmapService = new RoadmapRecommendationService();
    this.reviewService = new ReviewRecommendationService();
    this.reinforcementService = new ReinforcementRecommendationService();
    this.debtService = new DebtRecommendationService();
    this.recoveryService = new RecoveryRecommendationService();
    this.rankingService = new RecommendationRankingService();
    this.filteringService = new RecommendationFilteringService();
    this.explanationService = new RecommendationExplanationService();
  }

  async generate(
    childId: string,
    topicId: string,
  ): Promise<RecommendationSet> {
    const context = await this.loadContext(childId, topicId);
    const traces: RecommendationTrace[] = [];
    const builder = new RecommendationBuilder().withContext(context);

    try {
      const roadmapCandidates = this.timeStep(traces, 'roadmap', () =>
        this.roadmapService.generate(context),
      );

      const reviewCandidates = this.timeStep(traces, 'review', () =>
        this.reviewService.generate(context),
      );

      const reinforcementCandidates = this.timeStep(traces, 'reinforcement', () =>
        this.reinforcementService.generate(context),
      );

      const debtCandidates = this.timeStep(traces, 'debt', () =>
        this.debtService.generate(context),
      );

      const recoveryCandidates = this.timeStep(traces, 'recovery', () =>
        this.recoveryService.generate(context),
      );

      const allCandidates = [
        ...roadmapCandidates,
        ...reviewCandidates,
        ...reinforcementCandidates,
        ...debtCandidates,
        ...recoveryCandidates,
      ];

      const filtered = this.timeStep(traces, 'filter', () =>
        this.filteringService.filter(allCandidates, context),
      );

      const ranked = this.timeStep(traces, 'rank', () =>
        this.rankingService.rank(filtered, context),
      );

      const explanation = this.timeStep(traces, 'explain', () =>
        this.explanationService.generate(context, ranked),
      );

      builder.withRecommendations(ranked);
      builder.withTraces(traces);

      return builder.build();
    } catch (error) {
      throw new RecommendationGenerationError(
        'RecommendationGenerationEngine',
        error instanceof Error ? error.message : 'Generation failed',
      );
    }
  }

  private async loadContext(
    childId: string,
    topicId: string,
  ): Promise<RecommendationContext> {
    try {
      const [
        roadmapSections,
        adaptiveDecision,
        unresolvedDebts,
        reinforcementItems,
        activeRecovery,
        constraints,
      ] = await Promise.all([
        this.loaders.loadRoadmapSections(childId),
        this.loaders.loadAdaptiveDecision(childId, topicId),
        this.loaders.loadUnresolvedDebts(childId),
        this.loaders.loadReinforcementItems(childId),
        this.loaders.loadActiveRecovery(childId),
        this.loaders.loadConstraints(childId),
      ]);

      return new RecommendationContext({
        childId,
        topicId,
        adaptiveDecision,
        roadmapSections,
        unresolvedDebts,
        reinforcementItems,
        activeRecovery,
        constraints,
      });
    } catch (error) {
      throw new ContextLoadError(
        error instanceof Error ? error.message : 'Failed to load recommendation context',
      );
    }
  }

  private timeStep<T>(
    traces: RecommendationTrace[],
    step: string,
    fn: () => T,
  ): T {
    const start = Date.now();
    try {
      const result = fn();
      traces.push(new RecommendationTrace({
        step,
        input: {},
        output: result instanceof Array
          ? { count: result.length }
          : { result: true },
        timestamp: new Date(),
        durationMs: Date.now() - start,
      }));
      return result;
    } catch (error) {
      traces.push(new RecommendationTrace({
        step,
        input: {},
        output: { error: error instanceof Error ? error.message : 'Unknown' },
        timestamp: new Date(),
        durationMs: Date.now() - start,
      }));
      throw error;
    }
  }
}
