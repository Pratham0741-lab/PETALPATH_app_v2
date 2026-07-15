import { DecisionContext } from '../../domain/entities/decision-context.entity.js';
import {
  InterventionLevel,
  InterventionLevelValue,
} from '../../domain/value-objects/intervention-level.js';
import { engineConfig } from '../../../../shared/config/engine.config.js';

const INTERVENTION = engineConfig.intervention;

export class InterventionDecisionService {
  decide(context: DecisionContext): InterventionLevel {
    const state = context.learningState;
    const isRecovery = context.isInRecovery;

    const failureRate = state.totalAttempts > 0
      ? state.incorrectAttempts / state.totalAttempts
      : 0;

    const consecutiveFailures = state.retryCount;
    const hasConfidenceCollapse = state.confidence < INTERVENTION.confidenceCollapseThreshold;
    const hasDebtAccumulation = context.unresolvedDebts.length >= INTERVENTION.debtAccumulationThreshold;
    const hasHighSeverityDebt = context.unresolvedDebts.some(d => d.severity >= INTERVENTION.highSeverityDebtThreshold);

    let level: InterventionLevelValue = InterventionLevelValue.NONE;
    let trigger = '';
    const reasons: string[] = [];

    if (isRecovery) {
      level = InterventionLevelValue.CRITICAL;
      trigger = 'recovery_mode_active';
      reasons.push('Recovery mode is active');
    } else if (consecutiveFailures >= INTERVENTION.consecutiveFailuresHigh && hasConfidenceCollapse) {
      level = InterventionLevelValue.HIGH;
      trigger = 'confidence_collapse';
      reasons.push('Confidence collapsed after repeated failures');
    } else if (
      (failureRate > INTERVENTION.failureRateHigh && hasDebtAccumulation) ||
      hasHighSeverityDebt
    ) {
      level = InterventionLevelValue.HIGH;
      trigger = 'performance_decline';
      reasons.push('Severe performance decline with accumulated debt');
    } else if (consecutiveFailures >= INTERVENTION.consecutiveFailuresMedium) {
      level = InterventionLevelValue.MEDIUM;
      trigger = 'consecutive_failures';
      reasons.push(`${consecutiveFailures} consecutive failure(s)`);
    } else if (hasDebtAccumulation) {
      level = InterventionLevelValue.MEDIUM;
      trigger = 'debt_accumulation';
      reasons.push(`${context.unresolvedDebts.length} unresolved debts`);
    } else if (hasConfidenceCollapse) {
      level = InterventionLevelValue.MEDIUM;
      trigger = 'low_confidence';
      reasons.push('Confidence is critically low');
    } else if (failureRate > INTERVENTION.failureRateLow) {
      level = InterventionLevelValue.LOW;
      trigger = 'elevated_failure_rate';
      reasons.push('Elevated failure rate detected');
    }

    return new InterventionLevel({
      level,
      reason: reasons.join('; ') || 'No intervention needed',
      trigger: trigger || 'none',
    });
  }
}
