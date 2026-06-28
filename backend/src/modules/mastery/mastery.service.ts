import { MasteryState } from '../../shared/enums.js';
import { skillHealthRepository } from './repositories/skill-health.repository.js';
import { skillHistoryRepository } from './repositories/skill-history.repository.js';
import { regressionLogRepository } from './repositories/regression-log.repository.js';
import { reviewScheduleRepository } from './repositories/review-schedule.repository.js';
import { PerformanceRecordDto } from './mastery.validator.js';
import { logger } from '../../utils/logger.js';

export class MasteryEngineService {
  /**
   * Knowledge score is a direct representation of accuracy.
   * Range: 0–100
   */
  calculateKnowledgeScore(accuracy: number): number {
    return Math.max(0, Math.min(100, accuracy));
  }

  /**
   * Confidence score is calculated based on the lack of retries and help requests.
   * Uses a standard normalization ceiling of 5 (where 5+ retries or help requests results in max penalty).
   * Range: 0–100
   */
  calculateConfidenceScore(retries: number, helpRequests: number): number {
    const normalizedRetries = Math.min((retries / 5) * 100, 100);
    const normalizedHelpRequests = Math.min((helpRequests / 5) * 100, 100);

    const score = 0.5 * (100 - normalizedRetries) + 0.5 * (100 - normalizedHelpRequests);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Consistency score is the moving average accuracy over the last 5 performances.
   */
  async calculateConsistencyScore(childId: string, skillId: string, currentAccuracy: number): Promise<number> {
    const recentHistory = await skillHistoryRepository.findRecent(childId, skillId, 4);
    const accuracies = [currentAccuracy, ...recentHistory.map((h) => h.knowledgeScore)];
    const sum = accuracies.reduce((total, val) => total + val, 0);
    return sum / accuracies.length;
  }

  /**
   * Retention score decays dynamically based on the days elapsed since the last practice session.
   * Future performances adjust retention upwards (on success) or leave it decayed.
   * Range: 0–100
   */
  calculateRetentionScore(previousHealth: any, currentDate: Date, currentAccuracy: number): number {
    const defaultDecayFactor = 0.995;
    const initialRetention = 100.0;

    if (!previousHealth) {
      // First session: establish baseline
      return currentAccuracy >= 80 ? initialRetention : currentAccuracy;
    }

    const lastPracticed = new Date(previousHealth.lastPracticed);
    const timeDiff = currentDate.getTime() - lastPracticed.getTime();
    const daysElapsed = Math.max(0, timeDiff / (1000 * 60 * 60 * 24));

    const decayFactor = previousHealth.decayFactor ?? defaultDecayFactor;
    const decayedRetention = previousHealth.retentionScore * Math.pow(decayFactor, daysElapsed);

    // Update retention based on performance success (threshold of 80% accuracy)
    const isSuccessful = currentAccuracy >= 80;
    const updatedRetention = isSuccessful
      ? Math.min(100, decayedRetention + 30.0)
      : Math.max(0, decayedRetention - 10.0);

    return updatedRetention;
  }

  /**
   * Mastery score is a weighted combination of all performance dimensions.
   * Range: 0–100
   */
  calculateMasteryScore(scores: {
    knowledgeScore: number;
    retentionScore: number;
    confidenceScore: number;
    engagementScore: number;
    consistencyScore: number;
  }): number {
    const score =
      0.35 * scores.knowledgeScore +
      0.25 * scores.retentionScore +
      0.20 * scores.confidenceScore +
      0.10 * scores.engagementScore +
      0.10 * scores.consistencyScore;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine mastery state based on dynamic score thresholds.
   * Design accommodates potential future states (e.g. INTRODUCED, FRAGILE, PROFICIENT).
   */
  determineMasteryState(masteryScore: number): MasteryState {
    if (masteryScore < 40.0) {
      return MasteryState.LEARNING;
    }
    if (masteryScore >= 40.0 && masteryScore < 60.0) {
      return MasteryState.WEAK;
    }
    if (masteryScore >= 60.0 && masteryScore < 85.0) {
      return MasteryState.STRONG;
    }
    return MasteryState.MASTERED;
  }

  /**
   * Calculate next review schedule date based on mastery state.
   * Returns next review date and review frequency in days.
   */
  calculateNextReviewDate(state: MasteryState, currentDate: Date): { nextReviewDate: Date; frequencyDays: number } {
    let frequencyDays = 2; // Default frequency

    switch (state) {
      case MasteryState.LEARNING:
        frequencyDays = 2;
        break;
      case MasteryState.WEAK:
        frequencyDays = 1;
        break;
      case MasteryState.STRONG:
        frequencyDays = 7;
        break;
      case MasteryState.MASTERED:
        frequencyDays = 30;
        break;
      default:
        frequencyDays = 2;
        break;
    }

    const nextReviewDate = new Date(currentDate.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
    return { nextReviewDate, frequencyDays };
  }

  /**
   * Detect regression (drop of more than 20 points in mastery score).
   */
  detectRegression(previousScore: number, currentScore: number): boolean {
    return previousScore - currentScore > 20.0;
  }

  /**
   * Orchestrate performance record ingestion and update Mastery metrics.
   */
  async processPerformance(childId: string, skillId: string, dto: PerformanceRecordDto) {
    const currentDate = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const previousHealth = await skillHealthRepository.findByChildAndSkill(childId, skillId);

    // 1. Calculate scoring dimensions
    const knowledgeScore = this.calculateKnowledgeScore(dto.accuracy);
    const confidenceScore = this.calculateConfidenceScore(dto.retries, dto.helpRequests);
    const consistencyScore = await this.calculateConsistencyScore(childId, skillId, dto.accuracy);
    const retentionScore = this.calculateRetentionScore(previousHealth, currentDate, dto.accuracy);

    // 2. Compute overall mastery score
    const masteryScore = this.calculateMasteryScore({
      knowledgeScore,
      retentionScore,
      confidenceScore,
      engagementScore: dto.engagementScore,
      consistencyScore,
    });

    // 3. Determine new mastery state and schedule review
    const masteryState = this.determineMasteryState(masteryScore);
    const { nextReviewDate, frequencyDays } = this.calculateNextReviewDate(masteryState, currentDate);

    // 4. Update metrics counters
    const attemptCount = (previousHealth?.attemptCount ?? 0) + dto.attempts;
    const retryCount = (previousHealth?.retryCount ?? 0) + dto.retries;
    const reviewCount = previousHealth ? previousHealth.reviewCount + 1 : 1;
    const decayFactor = previousHealth?.decayFactor ?? 0.995;

    // 5. Detect regression and log if applicable
    if (previousHealth) {
      const isRegressed = this.detectRegression(previousHealth.masteryScore, masteryScore);
      if (isRegressed) {
        logger.info(
          { childId, skillId, prevScore: previousHealth.masteryScore, currentScore: masteryScore },
          'Mastery regression detected'
        );
        await regressionLogRepository.create({
          childId,
          skillId,
          previousScore: previousHealth.masteryScore,
          currentScore: masteryScore,
          previousState: previousHealth.masteryState,
          currentState: masteryState,
        });
      }
    }

    // 6. Update database SkillHealth state
    const updatedHealth = await skillHealthRepository.upsert(childId, skillId, {
      masteryState,
      knowledgeScore,
      confidenceScore,
      retentionScore,
      engagementScore: dto.engagementScore,
      consistencyScore,
      masteryScore,
      lastPracticed: currentDate,
      nextReviewDate,
      reviewCount,
      attemptCount,
      retryCount,
      decayFactor,
      frequencyDays,
    });

    // 6.b. Update derived ReviewSchedule
    await reviewScheduleRepository.upsert(childId, skillId, nextReviewDate, frequencyDays);

    // 7. Save historical snapshot
    await skillHistoryRepository.create({
      childId,
      skillId,
      knowledgeScore,
      confidenceScore,
      retentionScore,
      engagementScore: dto.engagementScore,
      consistencyScore,
      masteryScore,
      masteryState,
    });

    // 8. Reinforcement queue management is handled downstream
    //    by ReinforcementEngineService.detectWeakSkills() called
    //    from the Adaptive Controller's processPerformance flow.

    return updatedHealth;
  }
}

export const masteryEngineService = new MasteryEngineService();
