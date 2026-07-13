import { Modality } from '../../../../shared/enums.js';

export interface LearningStateProps {
  id: string;
  childId: string;
  topicId: string;
  mastery: number;
  confidence: number;
  stability: number;
  forgettingRate: number;
  reviewIntervalDays: number;
  lastReviewedAt: Date | null;
  lastPracticedAt: Date | null;
  correctAttempts: number;
  incorrectAttempts: number;
  streak: number;
  totalAttempts: number;
  averageResponseTimeMs: number;
  hintUsage: number;
  retryCount: number;
  currentDifficulty: string;
  currentModality: Modality | null;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningState {
  private readonly props: LearningStateProps;

  constructor(props: LearningStateProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(
    props: Omit<LearningStateProps, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): LearningState {
    const now = new Date();
    return new LearningState({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get mastery(): number { return this.props.mastery; }
  get confidence(): number { return this.props.confidence; }
  get stability(): number { return this.props.stability; }
  get forgettingRate(): number { return this.props.forgettingRate; }
  get reviewIntervalDays(): number { return this.props.reviewIntervalDays; }
  get lastReviewedAt(): Date | null { return this.props.lastReviewedAt; }
  get lastPracticedAt(): Date | null { return this.props.lastPracticedAt; }
  get correctAttempts(): number { return this.props.correctAttempts; }
  get incorrectAttempts(): number { return this.props.incorrectAttempts; }
  get streak(): number { return this.props.streak; }
  get totalAttempts(): number { return this.props.totalAttempts; }
  get averageResponseTimeMs(): number { return this.props.averageResponseTimeMs; }
  get hintUsage(): number { return this.props.hintUsage; }
  get retryCount(): number { return this.props.retryCount; }
  get currentDifficulty(): string { return this.props.currentDifficulty; }
  get currentModality(): Modality | null { return this.props.currentModality; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  withMastery(mastery: number): LearningState {
    return new LearningState({ ...this.props, mastery, updatedAt: new Date() });
  }

  withConfidence(confidence: number): LearningState {
    return new LearningState({ ...this.props, confidence, updatedAt: new Date() });
  }

  withStability(stability: number): LearningState {
    return new LearningState({ ...this.props, stability, updatedAt: new Date() });
  }

  withForgettingRate(rate: number): LearningState {
    return new LearningState({ ...this.props, forgettingRate: rate, updatedAt: new Date() });
  }

  withReviewInterval(days: number): LearningState {
    return new LearningState({ ...this.props, reviewIntervalDays: days, updatedAt: new Date() });
  }

  withLastReviewedAt(date: Date): LearningState {
    return new LearningState({ ...this.props, lastReviewedAt: date, updatedAt: new Date() });
  }

  withAttempt(correct: boolean, responseTimeMs: number, hintUsed: boolean, isRetry: boolean): LearningState {
    const next = { ...this.props };
    if (correct) {
      next.correctAttempts += 1;
      next.streak += 1;
      next.retryCount = 0;
    } else {
      next.incorrectAttempts += 1;
      next.streak = 0;
      if (isRetry) next.retryCount += 1;
    }
    next.totalAttempts += 1;
    if (hintUsed) next.hintUsage += 1;
    next.lastPracticedAt = new Date();
    next.averageResponseTimeMs = this.calculateRollingAverage(responseTimeMs);
    next.updatedAt = new Date();
    return new LearningState(next);
  }

  withCurrentDifficulty(difficulty: string): LearningState {
    return new LearningState({ ...this.props, currentDifficulty: difficulty, updatedAt: new Date() });
  }

  withCurrentModality(modality: Modality | null): LearningState {
    return new LearningState({ ...this.props, currentModality: modality, updatedAt: new Date() });
  }

  toPrismaCreate(): Record<string, unknown> {
    return {
      ...this.props,
      currentModality: this.props.currentModality ?? null,
    };
  }

  toPrismaUpdate(): Record<string, unknown> {
    return {
      mastery: this.props.mastery,
      confidence: this.props.confidence,
      stability: this.props.stability,
      forgettingRate: this.props.forgettingRate,
      reviewIntervalDays: this.props.reviewIntervalDays,
      lastReviewedAt: this.props.lastReviewedAt,
      lastPracticedAt: this.props.lastPracticedAt,
      correctAttempts: this.props.correctAttempts,
      incorrectAttempts: this.props.incorrectAttempts,
      streak: this.props.streak,
      totalAttempts: this.props.totalAttempts,
      averageResponseTimeMs: this.props.averageResponseTimeMs,
      hintUsage: this.props.hintUsage,
      retryCount: this.props.retryCount,
      currentDifficulty: this.props.currentDifficulty,
      currentModality: this.props.currentModality,
    };
  }

  private calculateRollingAverage(newResponseTimeMs: number): number {
    if (this.props.totalAttempts === 0) return newResponseTimeMs;
    const oldTotal = this.props.averageResponseTimeMs * this.props.totalAttempts;
    const newTotal = oldTotal + newResponseTimeMs;
    return newTotal / (this.props.totalAttempts + 1);
  }
}
