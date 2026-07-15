import { DecisionContext, DebtInfo, ReinforcementInfo, RecoveryInfo } from '../../domain/entities/decision-context.entity.js';
import { AdaptiveDecision } from '../../domain/entities/adaptive-decision.entity.js';
import { AdaptiveConstraints } from '../../domain/value-objects/adaptive-constraints.js';
import { SpacingAdjustment } from '../../domain/value-objects/spacing-adjustment.js';
import { DifficultyDecisionService } from './difficulty-decision.service.js';
import { ReviewDecisionService } from './review-decision.service.js';
import { ReinforcementDecisionService } from './reinforcement-decision.service.js';
import { DebtDecisionService } from './debt-decision.service.js';
import { ConfidenceDecisionService } from './confidence-decision.service.js';
import { InterventionDecisionService } from './intervention-decision.service.js';
import { DecisionExplanationService } from './decision-explanation.service.js';
import { AdaptiveDecisionBuilder } from './adaptive-decision-builder.service.js';
import { ContextLoadError, DecisionError } from '../../domain/errors.js';
import { engineConfig } from '../../../../shared/config/engine.config.js';

const SPACING = engineConfig.spacing;
const MASTERY = engineConfig.mastery.stateThresholds;

export interface ContextLoaders {
  loadLearningState: (childId: string, topicId: string) => Promise<any>;
  loadUnresolvedDebts: (childId: string) => Promise<DebtInfo[]>;
  loadReinforcementItems: (childId: string) => Promise<ReinforcementInfo[]>;
  loadActiveRecovery: (childId: string) => Promise<RecoveryInfo | null>;
  loadConstraints: (childId: string) => Promise<AdaptiveConstraints>;
}

export class AdaptiveIntelligenceEngine {
  private readonly difficultyService: DifficultyDecisionService;
  private readonly reviewService: ReviewDecisionService;
  private readonly reinforcementService: ReinforcementDecisionService;
  private readonly debtService: DebtDecisionService;
  private readonly confidenceService: ConfidenceDecisionService;
  private readonly interventionService: InterventionDecisionService;
  private readonly explanationService: DecisionExplanationService;

  constructor(
    private readonly loaders: ContextLoaders,
  ) {
    this.difficultyService = new DifficultyDecisionService();
    this.reviewService = new ReviewDecisionService();
    this.reinforcementService = new ReinforcementDecisionService();
    this.debtService = new DebtDecisionService();
    this.confidenceService = new ConfidenceDecisionService();
    this.interventionService = new InterventionDecisionService();
    this.explanationService = new DecisionExplanationService();
  }

  async evaluate(
    childId: string,
    topicId: string,
    sessionElapsedMinutes: number = 0,
    sessionRemainingMinutes: number = 30,
  ): Promise<AdaptiveDecision> {
    const context = await this.loadContext(
      childId, topicId, sessionElapsedMinutes, sessionRemainingMinutes,
    );

    try {
      const builder = new AdaptiveDecisionBuilder().withContext(context);

      const diffResult = this.difficultyService.decide(context);
      builder.withDifficulty(diffResult);

      const reviewResult = this.reviewService.decide(context);
      builder.withReviewPriority(reviewResult);
      builder.withNextReviewDate(reviewResult.nextReviewDate);

      const reinforcementResult = this.reinforcementService.decide(context);
      builder.withReinforcementPriority(reinforcementResult);

      const debtResult = this.debtService.decide(context);
      builder.withDebtPriority(debtResult);

      const confidenceResult = this.confidenceService.decide(context);
      builder.withConfidenceAdjustment(confidenceResult);

      const interventionResult = this.interventionService.decide(context);
      builder.withInterventionLevel(interventionResult);

      const spacing = this.computeSpacingAdjustment(context);
      builder.withSpacingAdjustment(spacing);

      const modality = this.computeRecommendedModality(context);
      builder.withRecommendedModality(modality);

      const explanation = this.explanationService.generate(
        context,
        diffResult,
        reviewResult,
        reinforcementResult,
        debtResult,
        interventionResult,
        confidenceResult,
      );
      builder.withExplanation(explanation);

      return builder.build();
    } catch (error) {
      throw new DecisionError(
        'AdaptiveIntelligenceEngine',
        error instanceof Error ? error.message : 'Engine evaluation failed',
      );
    }
  }

  private async loadContext(
    childId: string,
    topicId: string,
    sessionElapsedMinutes: number,
    sessionRemainingMinutes: number,
  ): Promise<DecisionContext> {
    try {
      const [learningState, unresolvedDebts, reinforcementItems, activeRecovery, constraints] =
        await Promise.all([
          this.loaders.loadLearningState(childId, topicId),
          this.loaders.loadUnresolvedDebts(childId),
          this.loaders.loadReinforcementItems(childId),
          this.loaders.loadActiveRecovery(childId),
          this.loaders.loadConstraints(childId),
        ]);

      if (!learningState) {
        throw new ContextLoadError(`No learning state found for child ${childId}, topic ${topicId}`);
      }

      return new DecisionContext({
        childId,
        topicId,
        learningState,
        unresolvedDebts,
        reinforcementItems,
        activeRecovery,
        constraints,
        sessionElapsedMinutes,
        sessionRemainingMinutes,
      });
    } catch (error) {
      if (error instanceof ContextLoadError) throw error;
      throw new ContextLoadError(
        error instanceof Error ? error.message : 'Failed to load decision context',
      );
    }
  }

  private computeSpacingAdjustment(context: DecisionContext): SpacingAdjustment {
    const state = context.learningState;
    const failureRate = state.totalAttempts > 0
      ? state.incorrectAttempts / state.totalAttempts
      : 0;

    if (failureRate > SPACING.contractFailureRateThreshold || state.retryCount >= SPACING.contractRetryCountThreshold) {
      return new SpacingAdjustment(-1, 'Contract spacing due to poor performance');
    }
    if (state.mastery >= MASTERY.strong && state.stability > SPACING.expandStabilityThreshold) {
      return new SpacingAdjustment(1, 'Expand spacing due to strong mastery');
    }
    return new SpacingAdjustment(0, 'Spacing unchanged');
  }

  private computeRecommendedModality(context: DecisionContext): string | null {
    const preferred = context.constraints.preferredModalities;
    if (preferred.length > 0) {
      return preferred[0];
    }
    return context.learningState.currentModality;
  }
}
