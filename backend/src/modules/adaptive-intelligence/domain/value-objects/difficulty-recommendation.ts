export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD',
}

export class DifficultyRecommendation {
  readonly recommendedDifficulty: DifficultyLevel;
  readonly previousDifficulty: DifficultyLevel;
  readonly delta: number;
  readonly reason: string;
  readonly confidence: number;

  constructor(props: {
    recommendedDifficulty: DifficultyLevel;
    previousDifficulty: DifficultyLevel;
    delta: number;
    reason: string;
    confidence: number;
  }) {
    this.recommendedDifficulty = props.recommendedDifficulty;
    this.previousDifficulty = props.previousDifficulty;
    this.delta = props.delta;
    this.reason = props.reason;
    this.confidence = props.confidence;
  }
}
