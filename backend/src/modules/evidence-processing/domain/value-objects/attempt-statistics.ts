export class AttemptStatistics {
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly incorrectAttempts: number;
  readonly streak: number;
  readonly averageResponseTimeMs: number;
  readonly hintUsage: number;
  readonly retryCount: number;

  constructor(props: {
    totalAttempts: number;
    correctAttempts: number;
    incorrectAttempts: number;
    streak: number;
    averageResponseTimeMs: number;
    hintUsage: number;
    retryCount: number;
  }) {
    this.totalAttempts = props.totalAttempts;
    this.correctAttempts = props.correctAttempts;
    this.incorrectAttempts = props.incorrectAttempts;
    this.streak = props.streak;
    this.averageResponseTimeMs = props.averageResponseTimeMs;
    this.hintUsage = props.hintUsage;
    this.retryCount = props.retryCount;
  }

  get accuracy(): number {
    if (this.totalAttempts === 0) return 0;
    return Math.round((this.correctAttempts / this.totalAttempts) * 10000) / 100;
  }

  get isStruggling(): boolean {
    return this.streak === 0 && this.totalAttempts > 0;
  }
}
