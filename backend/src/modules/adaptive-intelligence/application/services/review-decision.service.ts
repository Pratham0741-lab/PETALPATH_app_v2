import { DecisionContext } from '../../domain/entities/decision-context.entity.js';
import { ReviewPriority } from '../../domain/value-objects/review-priority.js';
import { engineConfig } from '../../../../shared/config/engine.config.js';
import { retentionPercentage } from '../../../../shared/retention-formula.js';

export class ReviewDecisionService {
  decide(context: DecisionContext): ReviewPriority {
    const state = context.learningState;

    const retention = this.calculateRetention(state);
    const daysSinceReview = this.daysSinceLastReview(state);
    const overdueDays = Math.max(0, daysSinceReview - state.reviewIntervalDays);

    let priority = 0;
    const reasons: string[] = [];

    if (state.stability <= 0.5) {
      priority += 40;
      reasons.push('Low stability indicates forgetting risk');
    }

    if (state.forgettingRate > 0.2) {
      priority += 20;
      reasons.push('High forgetting rate');
    }

    if (retention < 50) {
      priority += 30;
      reasons.push('Retention probability below threshold');
    }

    if (overdueDays > 0) {
      priority += Math.min(30, overdueDays * 10);
      reasons.push(`Overdue by ${overdueDays} day(s)`);
    }

    if (daysSinceReview <= 1 && state.reviewIntervalDays > 0) {
      priority = Math.max(0, priority - 20);
    }

    const dueItems = context.reinforcementItems.filter(
      r => r.status === 'ACTIVE',
    );
    if (dueItems.length > 0) {
      priority += 10;
      reasons.push('Active reinforcement queue items');
    }

    priority = Math.max(0, Math.min(100, priority));

    const nextReviewDate = overdueDays > 0
      ? new Date()
      : this.calculateNextReview(state);

    return new ReviewPriority({
      priority: Math.round(priority),
      nextReviewDate,
      retentionProbability: Math.round(retention),
      reason: reasons.join('; ') || 'Review not urgently needed',
    });
  }

  private calculateRetention(state: {
    stability: number;
    lastReviewedAt: Date | null;
  }): number {
    const now = Date.now();
    const lastReview = state.lastReviewedAt?.getTime() ?? now;
    const elapsedDays = Math.max(0, (now - lastReview) / (1000 * 60 * 60 * 24));
    const power = engineConfig.learningState.forgettingCurve.retentionDecayPower;
    return retentionPercentage(state.stability, elapsedDays, power);
  }

  private daysSinceLastReview(state: { lastReviewedAt: Date | null }): number {
    if (!state.lastReviewedAt) return 999;
    return Math.max(0, (Date.now() - state.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateNextReview(state: { reviewIntervalDays: number; lastPracticedAt: Date | null }): Date {
    const base = state.lastPracticedAt ?? new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + state.reviewIntervalDays);
    return next;
  }
}
