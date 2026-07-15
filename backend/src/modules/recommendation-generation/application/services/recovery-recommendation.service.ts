import { RecommendationContext } from '../../domain/entities/recommendation-context.entity.js';
import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RecommendationType } from '../../domain/value-objects/recommendation-type.js';
import { RecommendationPriority } from '../../domain/value-objects/recommendation-priority.js';
import { RecommendationConfidence } from '../../domain/value-objects/recommendation-confidence.js';
import { EstimatedDuration } from '../../domain/value-objects/estimated-duration.js';

export class RecoveryRecommendationService {
  generate(context: RecommendationContext): Recommendation[] {
    const items: Recommendation[] = [];
    const decision = context.adaptiveDecision;

    if (!context.isRecoveryActive) return items;

    const recovery = context.activeRecovery;

    const priority = new RecommendationPriority(90, 1.5);

    const confidence = new RecommendationConfidence(85);

    const explanations: string[] = [];
    explanations.push('Recovery mode is active — recommendations prioritized for recovery');
    explanations.push(`Trigger: ${recovery?.triggerReason ?? 'Unknown'}`);

    if (recovery?.currentTier && recovery.currentTier >= 4) {
      explanations.push('Advanced recovery tier — easier difficulty recommended');
    }

    items.push(
      Recommendation.create({
        recommendationType: RecommendationType.RECOVERY,
        topicId: context.topicId,
        roadmapItemId: null,
        modality: decision.result.recommendedModality,
        difficulty: 'EASY',
        estimatedDuration: new EstimatedDuration(3, 8),
        priority,
        confidence,
        explanation: explanations,
        prerequisitesSatisfied: true,
        recoveryAware: true,
        reinforcementAware: false,
        source: 'recovery',
      }),
    );

    const debtRecoveryItems = context.unresolvedDebts
      .filter(d => !d.resolved && d.severity >= 0.5)
      .slice(0, 2);

    for (const debt of debtRecoveryItems) {
      items.push(
        Recommendation.create({
          recommendationType: RecommendationType.RECOVERY,
          topicId: debt.topicId,
          roadmapItemId: null,
          modality: decision.result.recommendedModality,
          difficulty: 'EASY',
          estimatedDuration: new EstimatedDuration(3, 8),
          priority: new RecommendationPriority(80, 1.3),
          confidence: new RecommendationConfidence(80),
          explanation: [
            'Recovery mode debt item — simplified practice recommended',
            `Debt: ${debt.debtType} (severity: ${debt.severity})`,
          ],
          prerequisitesSatisfied: true,
          recoveryAware: true,
          reinforcementAware: false,
          source: 'recovery',
        }),
      );
    }

    return items;
  }
}
