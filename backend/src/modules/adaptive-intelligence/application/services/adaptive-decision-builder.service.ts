import { DecisionContext } from '../../domain/entities/decision-context.entity.js';
import { DecisionResult } from '../../domain/entities/decision-result.entity.js';
import { DecisionSummary } from '../../domain/entities/decision-summary.entity.js';
import { DecisionTrace } from '../../domain/entities/decision-trace.entity.js';
import { AdaptiveDecision } from '../../domain/entities/adaptive-decision.entity.js';
import { DifficultyRecommendation } from '../../domain/value-objects/difficulty-recommendation.js';
import { ReviewPriority } from '../../domain/value-objects/review-priority.js';
import { PriorityScore } from '../../domain/value-objects/priority-score.js';
import { SpacingAdjustment } from '../../domain/value-objects/spacing-adjustment.js';
import { InterventionLevel } from '../../domain/value-objects/intervention-level.js';
import { DecisionConfidence } from '../../domain/value-objects/decision-confidence.js';

export class AdaptiveDecisionBuilder {
  private context!: DecisionContext;
  private difficulty!: DifficultyRecommendation;
  private reviewPriority!: ReviewPriority;
  private reinforcementPriority!: PriorityScore;
  private debtPriority!: PriorityScore;
  private masteryPriority!: PriorityScore;
  private confidenceAdjustment: number = 0;
  private spacingAdjustment!: SpacingAdjustment;
  private nextReviewDate: Date | null = null;
  private recommendedModality: string | null = null;
  private interventionLevel!: InterventionLevel;
  private explanation: string[] = [];
  private traces: DecisionTrace[] = [];

  withContext(context: DecisionContext): this {
    this.context = context;
    return this;
  }

  withDifficulty(difficulty: DifficultyRecommendation): this {
    this.difficulty = difficulty;
    return this;
  }

  withReviewPriority(priority: ReviewPriority): this {
    this.reviewPriority = priority;
    return this;
  }

  withReinforcementPriority(priority: PriorityScore): this {
    this.reinforcementPriority = priority;
    return this;
  }

  withDebtPriority(priority: PriorityScore): this {
    this.debtPriority = priority;
    return this;
  }

  withMasteryPriority(priority: PriorityScore): this {
    this.masteryPriority = priority;
    return this;
  }

  withConfidenceAdjustment(adjustment: number): this {
    this.confidenceAdjustment = adjustment;
    return this;
  }

  withSpacingAdjustment(adjustment: SpacingAdjustment): this {
    this.spacingAdjustment = adjustment;
    return this;
  }

  withNextReviewDate(date: Date | null): this {
    this.nextReviewDate = date;
    return this;
  }

  withRecommendedModality(modality: string | null): this {
    this.recommendedModality = modality;
    return this;
  }

  withInterventionLevel(intervention: InterventionLevel): this {
    this.interventionLevel = intervention;
    return this;
  }

  withExplanation(explanation: string[]): this {
    this.explanation = explanation;
    return this;
  }

  withTrace(trace: DecisionTrace): this {
    this.traces.push(trace);
    return this;
  }

  private buildMasteryPriority(context: DecisionContext): PriorityScore {
    const state = context.learningState;
    const gap = 100 - state.mastery;
    const score = Math.max(0, Math.min(100, gap * 1.2));
    return new PriorityScore(Math.round(score), 0.2, 'mastery');
  }

  build(customId?: string): AdaptiveDecision {
    if (!this.context) throw new Error('AdaptiveDecisionBuilder: context is required');
    if (!this.difficulty) throw new Error('AdaptiveDecisionBuilder: difficulty is required');
    if (!this.reviewPriority) throw new Error('AdaptiveDecisionBuilder: reviewPriority is required');
    if (!this.reinforcementPriority) throw new Error('AdaptiveDecisionBuilder: reinforcementPriority is required');
    if (!this.debtPriority) throw new Error('AdaptiveDecisionBuilder: debtPriority is required');
    if (!this.spacingAdjustment) throw new Error('AdaptiveDecisionBuilder: spacingAdjustment is required');
    if (!this.interventionLevel) throw new Error('AdaptiveDecisionBuilder: interventionLevel is required');

    const masteryPrio = this.masteryPriority ?? this.buildMasteryPriority(this.context);

    const result = new DecisionResult({
      difficulty: this.difficulty,
      reviewPriority: this.reviewPriority,
      reinforcementPriority: this.reinforcementPriority,
      debtPriority: this.debtPriority,
      masteryPriority: masteryPrio,
      confidenceAdjustment: this.confidenceAdjustment,
      spacingAdjustment: this.spacingAdjustment,
      nextReviewDate: this.nextReviewDate,
      recommendedModality: this.recommendedModality,
      interventionLevel: this.interventionLevel,
      explanation: this.explanation,
      confidenceScore: this.buildConfidenceScore(),
      traces: this.traces,
    });

    const summary = this.buildSummary(result);

    return new AdaptiveDecision({
      id: customId ?? crypto.randomUUID(),
      childId: this.context.childId,
      topicId: this.context.topicId,
      context: this.context,
      result,
      summary,
      evaluatedAt: new Date(),
    });
  }

  private buildConfidenceScore(): DecisionConfidence {
    const totalScore =
      this.difficulty.confidence +
      this.reviewPriority.priority +
      this.reinforcementPriority.score +
      this.debtPriority.score;
    const avgScore = Math.round(totalScore / 4);
    return new DecisionConfidence({
      score: Math.max(0, Math.min(100, avgScore)),
      weight: 0.8,
      contributingFactors: [
        `difficulty: ${this.difficulty.confidence}`,
        `review: ${this.reviewPriority.priority}`,
        `reinforcement: ${this.reinforcementPriority.score}`,
        `debt: ${this.debtPriority.score}`,
      ],
    });
  }

  private buildSummary(result: DecisionResult): DecisionSummary {
    const priorities = [
      { name: 'review', score: result.reviewPriority.priority },
      { name: 'reinforcement', score: result.reinforcementPriority.score },
      { name: 'debt', score: result.debtPriority.score },
      { name: 'mastery', score: result.masteryPriority.score },
    ];
    priorities.sort((a, b) => b.score - a.score);
    const primaryFocus = priorities[0]?.name ?? 'none';

    const topIntervention = result.interventionLevel.level;
    const urgency = topIntervention === 'CRITICAL' || topIntervention === 'HIGH'
      ? 'high'
      : topIntervention === 'MEDIUM'
        ? 'medium'
        : 'low';

    return new DecisionSummary({
      totalDecisions: 7,
      primaryFocus,
      urgency,
      keyAction: `Adjust difficulty to ${result.difficulty.recommendedDifficulty}, focus on ${primaryFocus}`,
      recommendedDifficulty: result.difficulty.recommendedDifficulty,
      recommendedModality: result.recommendedModality,
      interventionLevel: topIntervention,
    });
  }
}
