import { DecisionContext } from '../../domain/entities/decision-context.entity.js';
import { PriorityScore } from '../../domain/value-objects/priority-score.js';
import { engineConfig } from '../../../../shared/config/engine.config.js';

export class ReinforcementDecisionService {
  decide(context: DecisionContext): PriorityScore {
    const state = context.learningState;
    const dueItems = context.reinforcementItems.filter(
      r => r.status === 'ACTIVE',
    );

    let score = 0;
    const reasons: string[] = [];

    if (state.mastery < engineConfig.mastery.stateThresholds.strong) {
      score += (engineConfig.mastery.stateThresholds.strong - state.mastery) * 1.5;
      reasons.push('Mastery below strong threshold');
    }

    if (state.confidence < engineConfig.adaptive.confidence.highThreshold) {
      score += (engineConfig.adaptive.confidence.highThreshold - state.confidence) * 0.8;
      reasons.push('Confidence below threshold');
    }

    if (state.forgettingRate > 0.15) {
      score += state.forgettingRate * 100;
      reasons.push('Elevated forgetting rate');
    }

    if (dueItems.length > 0) {
      score += dueItems.length * 15;
      reasons.push(`${dueItems.length} active reinforcement items`);
    }

    const overdueItems = dueItems.filter(r => {
      if (!r.nextReviewAt) return false;
      return new Date() > new Date(r.nextReviewAt);
    });
    if (overdueItems.length > 0) {
      score += overdueItems.length * 20;
      reasons.push(`${overdueItems.length} overdue review(s)`);
    }

    score = Math.max(0, Math.min(100, score));

    return new PriorityScore(
      Math.round(score),
      0.3,
      'reinforcement',
    );
  }
}
