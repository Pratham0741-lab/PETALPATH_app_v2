import { DecisionContext } from '../../domain/entities/decision-context.entity.js';
import { PriorityScore } from '../../domain/value-objects/priority-score.js';

export class DebtDecisionService {
  decide(context: DecisionContext): PriorityScore {
    const debts = context.unresolvedDebts;

    if (debts.length === 0) {
      return new PriorityScore(0, 0.25, 'debt');
    }

    let score = 0;
    const reasons: string[] = [];

    const highSeverityDebts = debts.filter(d => d.severity >= 0.7);
    const mediumSeverityDebts = debts.filter(
      d => d.severity >= 0.4 && d.severity < 0.7,
    );

    score += highSeverityDebts.length * 30;
    if (highSeverityDebts.length > 0) {
      reasons.push(`${highSeverityDebts.length} high-severity debt(s)`);
    }

    score += mediumSeverityDebts.length * 15;
    if (mediumSeverityDebts.length > 0) {
      reasons.push(`${mediumSeverityDebts.length} medium-severity debt(s)`);
    }

    score += debts.length * 10;
    reasons.push(`${debts.length} total unresolved debt(s)`);

    const practiceDebts = debts.filter(d => d.debtType === 'PRACTICE');
    const reinforcementDebts = debts.filter(d => d.debtType === 'REINFORCEMENT');
    const reviewDebts = debts.filter(d => d.debtType === 'REVIEW');

    if (practiceDebts.length > 0) score += 10;
    if (reinforcementDebts.length > 0) score += 5;
    if (reviewDebts.length > 0) score += 5;

    score = Math.max(0, Math.min(100, score));

    return new PriorityScore(
      Math.round(score),
      0.25,
      'debt',
    );
  }
}
