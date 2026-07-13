import { MasteryState } from '../../shared/enums.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { skillHealthRepository } from './repositories/skill-health.repository.js';
import { skillHistoryRepository } from './repositories/skill-history.repository.js';
import { regressionLogRepository } from './repositories/regression-log.repository.js';
import { reviewScheduleRepository } from './repositories/review-schedule.repository.js';
import { PerformanceRecordDto } from './mastery.validator.js';
import { logger } from '../../utils/logger.js';
import { SkillHealth } from '@prisma/client';

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
    const retryCeil = engineConfig.mastery.confidence.retryNormalizationCeiling;
    const helpCeil = engineConfig.mastery.confidence.helpNormalizationCeiling;
    const normalizedRetries = Math.min((retries / retryCeil) * 100, 100);
    const normalizedHelpRequests = Math.min((helpRequests / helpCeil) * 100, 100);

    const score = 0.5 * (100 - normalizedRetries) + 0.5 * (100 - normalizedHelpRequests);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Consistency score is the moving average accuracy over the last 5 performances.
   */
  async calculateConsistencyScore(childId: string, skillId: string, currentAccuracy: number): Promise<number> {
    const recentHistory = await skillHistoryRepository.findRecent(childId, skillId, engineConfig.mastery.consistencyWindowSize - 1);
    const accuracies = [currentAccuracy, ...recentHistory.map((h) => h.knowledgeScore)];
    const sum = accuracies.reduce((total, val) => total + val, 0);
    return sum / accuracies.length;
  }

  /**
   * Retention score decays dynamically based on the days elapsed since the last practice session.
   * Future performances adjust retention upwards (on success) or leave it decayed.
   * Range: 0–100
   */
  calculateRetentionScore(previousHealth: SkillHealth | null, currentDate: Date, currentAccuracy: number): number {
    const defaultDecayFactor = engineConfig.mastery.retention.decayFactor;
    const initialRetention = engineConfig.mastery.retention.initialRetention;
    const successThreshold = engineConfig.mastery.retention.successAccuracyThreshold;

    if (!previousHealth) {
      // First session: establish baseline
      return currentAccuracy >= successThreshold ? initialRetention : currentAccuracy;
    }

    const lastPracticed = new Date(previousHealth.lastPracticed);
    const timeDiff = currentDate.getTime() - lastPracticed.getTime();
    const daysElapsed = Math.max(0, timeDiff / (1000 * 60 * 60 * 24));

    const decayFactor = previousHealth.decayFactor ?? defaultDecayFactor;
    const decayedRetention = previousHealth.retentionScore * Math.pow(decayFactor, daysElapsed);

    // Update retention based on performance success
    const isSuccessful = currentAccuracy >= successThreshold;
    const updatedRetention = isSuccessful
      ? Math.min(100, decayedRetention + engineConfig.mastery.retention.successBoost)
      : Math.max(0, decayedRetention - engineConfig.mastery.retention.failurePenalty);

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
    const w = engineConfig.mastery.weights;
    const score =
      w.knowledge * scores.knowledgeScore +
      w.retention * scores.retentionScore +
      w.confidence * scores.confidenceScore +
      w.engagement * scores.engagementScore +
      w.consistency * scores.consistencyScore;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine mastery state based on dynamic score thresholds.
   * Design accommodates potential future states (e.g. INTRODUCED, FRAGILE, PROFICIENT).
   */
  determineMasteryState(masteryScore: number): MasteryState {
    const t = engineConfig.mastery.stateThresholds;
    if (masteryScore < t.learning) {
      return MasteryState.LEARNING;
    }
    if (masteryScore >= t.learning && masteryScore < t.weak) {
      return MasteryState.WEAK;
    }
    if (masteryScore >= t.weak && masteryScore < t.strong) {
      return MasteryState.STRONG;
    }
    return MasteryState.MASTERED;
  }

  /**
   * Calculate next review schedule date based on mastery state.
   * Returns next review date and review frequency in days.
   */
  calculateNextReviewDate(state: MasteryState, currentDate: Date): { nextReviewDate: Date; frequencyDays: number } {
    const cad = engineConfig.mastery.reviewCadenceDays;
    let frequencyDays: number = engineConfig.mastery.defaultFrequencyDays;

    switch (state) {
      case MasteryState.LEARNING:
        frequencyDays = cad.learning;
        break;
      case MasteryState.WEAK:
        frequencyDays = cad.weak;
        break;
      case MasteryState.STRONG:
        frequencyDays = cad.strong;
        break;
      case MasteryState.MASTERED:
        frequencyDays = cad.mastered;
        break;
      default:
        frequencyDays = engineConfig.mastery.defaultFrequencyDays;
        break;
    }

    const nextReviewDate = new Date(currentDate.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
    return { nextReviewDate, frequencyDays };
  }

  /**
   * Detect regression (drop of more than 20 points in mastery score).
   */
  detectRegression(previousScore: number, currentScore: number): boolean {
    return previousScore - currentScore > engineConfig.mastery.regressionDropThreshold;
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
    const decayFactor = previousHealth?.decayFactor ?? engineConfig.mastery.retention.decayFactor;

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
