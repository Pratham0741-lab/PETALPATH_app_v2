import { MasteryState } from '../../shared/enums.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import * as scoring from './mastery-scoring.js';
import { nextReviewDateFor } from './review-cadence.js';
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
    return scoring.knowledgeScore(accuracy);
  }

  /**
   * Confidence score — how surely the child arrived at a *correct* answer.
   *
   * Takes the whole evidence record rather than just the two penalty counts:
   * built from penalties alone, this returned 100 for a child who had done
   * nothing at all. See `mastery-scoring.ts::confidenceScore`.
   * Range: 0–100
   */
  calculateConfidenceScore(input: scoring.ConfidenceInput): number {
    return scoring.confidenceScore(input);
  }

  /**
   * Consistency score over the last `consistencyWindowSize` performances:
   * mean accuracy less its volatility, so a steady learner outscores an erratic
   * one at the same average.
   */
  async calculateConsistencyScore(childId: string, skillId: string, currentAccuracy: number): Promise<number> {
    const recentHistory = await skillHistoryRepository.findRecent(childId, skillId, engineConfig.mastery.consistencyWindowSize - 1);
    const accuracies = [currentAccuracy, ...recentHistory.map((h) => h.knowledgeScore)];
    return scoring.consistencyScore(accuracies).score;
  }

  /**
   * Retention score decays over the days elapsed since the last practice
   * session, then moves toward today's demonstrated accuracy in bounded steps.
   * Range: 0–100
   */
  calculateRetentionScore(previousHealth: SkillHealth | null, currentDate: Date, currentAccuracy: number): number {
    return scoring.retentionScore(previousHealth, currentDate, currentAccuracy);
  }

  /**
   * Mastery score is a weighted combination of all performance dimensions.
   * Range: 0–100
   */
  calculateMasteryScore(scores: scoring.DimensionScores): number {
    return scoring.combineDimensions(scores);
  }

  /**
   * Determine mastery state based on dynamic score thresholds.
   * Design accommodates potential future states (e.g. INTRODUCED, FRAGILE, PROFICIENT).
   */
  determineMasteryState(masteryScore: number): MasteryState {
    return scoring.masteryStateFor(masteryScore);
  }

  /**
   * Calculate next review schedule date based on mastery state.
   * Returns next review date and review frequency in days.
   *
   * Delegates to `review-cadence.ts`, which is authoritative for the cadence and
   * schedules to the start of a local calendar day. The signature is unchanged,
   * so every existing caller is untouched; what changes is that a lesson
   * finished at 23:50 now comes due at breakfast rather than at 23:50 tomorrow,
   * and that STRONG's interval is the product's 2 days rather than 7.
   */
  calculateNextReviewDate(state: MasteryState, currentDate: Date): { nextReviewDate: Date; frequencyDays: number } {
    return nextReviewDateFor(state, currentDate);
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
    const confidenceScore = this.calculateConfidenceScore({
      accuracy: dto.accuracy,
      attempts: dto.attempts,
      retries: dto.retries,
      helpRequests: dto.helpRequests,
    });
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
