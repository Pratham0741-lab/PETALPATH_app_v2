/**
 * Scoring System — PetalPath Drag & Drop Subsystem
 * Pure numeric score calculation, decoupled from star rating presentation.
 */

import { ScoringModel } from '../types';

export interface ScoreResult {
  numericScore: number;
  percentageScore: number;
  earnedPoints: number;
  maxPoints: number;
}

export class ScoringSystem {
  calculateScore(
    totalItems: number,
    correctCount: number,
    incorrectCount: number,
    elapsedTimeMs: number,
    model: ScoringModel
  ): ScoreResult {
    const basePoints = model.basePointsPerItem ?? 10;
    const maxPoints = model.maxScore ?? totalItems * basePoints;

    let earnedPoints = 0;

    switch (model.type) {
      case 'per-item': {
        earnedPoints = correctCount * basePoints;
        break;
      }
      case 'all-or-nothing': {
        earnedPoints = correctCount === totalItems && incorrectCount === 0 ? maxPoints : 0;
        break;
      }
      case 'partial-credit': {
        const penalty = incorrectCount * (basePoints * 0.2);
        earnedPoints = Math.max(0, correctCount * basePoints - penalty);
        break;
      }
      case 'time-weighted': {
        const timeFactor = Math.max(0.5, 1 - elapsedTimeMs / 120000); // Penalty after 2 mins
        earnedPoints = Math.round(correctCount * basePoints * timeFactor);
        break;
      }
      default:
        earnedPoints = correctCount * basePoints;
    }

    const numericScore = Math.min(maxPoints, Math.max(0, earnedPoints));
    const percentageScore = maxPoints > 0 ? numericScore / maxPoints : 1.0;

    return {
      numericScore,
      percentageScore,
      earnedPoints: numericScore,
      maxPoints,
    };
  }
}
