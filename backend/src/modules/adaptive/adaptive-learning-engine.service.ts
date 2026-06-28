import { ActivityType, AdaptationEventType } from '../../shared/enums.js';
import { learningProfileRepository } from './repositories/learning-profile.repository.js';
import { modalityPerformanceRepository } from './repositories/modality-performance.repository.js';
import { adaptationEventRepository } from './repositories/adaptation-event.repository.js';
import { learningEventRepository } from './repositories/learning-event.repository.js';
import { regressionLogRepository } from './repositories/regression-log.repository.js';
import { skillHistoryRepository } from '../mastery/repositories/skill-history.repository.js';
import { logger } from '../../utils/logger.js';

export class AdaptiveLearningEngineService {
  /**
   * Tracks effectiveness of each learning modality and updates moving averages.
   */
  async analyzePerformance(
    childId: string,
    activityType: ActivityType,
    accuracy: number,
    engagementScore: number,
    confidenceScore: number
  ) {
    const existing = await modalityPerformanceRepository.findByChildAndModality(childId, activityType);
    const now = new Date();

    if (!existing) {
      return modalityPerformanceRepository.upsert(childId, activityType, {
        attempts: 1,
        averageAccuracy: accuracy,
        averageEngagement: engagementScore,
        averageConfidence: confidenceScore,
        lastUsedAt: now,
      });
    }

    const attempts = existing.attempts + 1;
    const averageAccuracy = (existing.averageAccuracy * existing.attempts + accuracy) / attempts;
    const averageEngagement = (existing.averageEngagement * existing.attempts + engagementScore) / attempts;
    const averageConfidence = (existing.averageConfidence * existing.attempts + confidenceScore) / attempts;

    return modalityPerformanceRepository.upsert(childId, activityType, {
      attempts,
      averageAccuracy,
      averageEngagement,
      averageConfidence,
      lastUsedAt: now,
    });
  }

  /**
   * Checks if mastery score is low and records weakness event.
   */
  async detectWeaknesses(childId: string, skillId: string, masteryScore: number) {
    if (masteryScore < 50.0) {
      // Avoid duplicate trigger if logged in last hour
      const recent = await adaptationEventRepository.findRecent(
        childId,
        AdaptationEventType.WEAKNESS_DETECTED,
        new Date(Date.now() - 60 * 60 * 1000)
      );

      if (!recent) {
        await adaptationEventRepository.create({
          childId,
          eventType: AdaptationEventType.WEAKNESS_DETECTED,
          reason: `Child scored ${masteryScore.toFixed(1)} on skill (below 50% threshold).`,
          metadata: { skillId, masteryScore },
        });
      }
    }
  }

  /**
   * Checks if mastery score is high and records strength event.
   */
  async detectStrengths(childId: string, skillId: string, masteryScore: number) {
    if (masteryScore > 85.0) {
      const recent = await adaptationEventRepository.findRecent(
        childId,
        AdaptationEventType.STRENGTH_DETECTED,
        new Date(Date.now() - 60 * 60 * 1000)
      );

      if (!recent) {
        await adaptationEventRepository.create({
          childId,
          eventType: AdaptationEventType.STRENGTH_DETECTED,
          reason: `Child scored ${masteryScore.toFixed(1)} on skill (exceeding 85% threshold).`,
          metadata: { skillId, masteryScore },
        });
      }
    }
  }

  /**
   * Logs a regression and creates a regression event if score drops by > 20 points.
   */
  async detectRegression(
    childId: string,
    skillId: string,
    previousScore: number,
    currentScore: number
  ) {
    const difference = previousScore - currentScore;
    if (difference > 20.0) {
      await regressionLogRepository.create({
        childId,
        skillId,
        previousScore,
        currentScore,
        difference,
        previousState: 'STRONG', // Temporary mock state required by existing Phase 7 relations
        currentState: 'WEAK',
      });

      await adaptationEventRepository.create({
        childId,
        eventType: AdaptationEventType.REGRESSION_DETECTED,
        reason: `Performance regression of ${difference.toFixed(1)} points detected.`,
        metadata: { skillId, previousScore, currentScore, difference },
      });
    }
  }

  /**
   * Calculates velocity (masteryScore increase / days elapsed).
   */
  async calculateLearningVelocity(childId: string, skillId: string, currentScore: number): Promise<number> {
    const history = await skillHistoryRepository.findRecent(childId, skillId, 100);
    if (history.length < 2) {
      return 0.0;
    }

    const firstRecord = history[history.length - 1];
    const initialScore = firstRecord.masteryScore;
    const initialDate = new Date(firstRecord.timestamp);
    const currentDate = new Date();

    const timeDiff = currentDate.getTime() - initialDate.getTime();
    const daysElapsed = Math.max(0.1, timeDiff / (1000 * 60 * 60 * 24)); // Minimum 0.1 days to avoid infinity

    const scoreDelta = currentScore - initialScore;
    return Math.max(0, scoreDelta / daysElapsed);
  }

  /**
   * Computes preferred modality using modalityScore = 0.4*Accuracy + 0.4*Engagement + 0.2*Confidence.
   */
  async calculatePreferredModality(childId: string): Promise<ActivityType> {
    const modalities = await modalityPerformanceRepository.findByChild(childId);
    if (modalities.length === 0) {
      return ActivityType.VIDEO; // Default modality
    }

    let bestModality: ActivityType = ActivityType.VIDEO;
    let highestScore = -1;

    for (const mod of modalities) {
      const score = 0.4 * mod.averageAccuracy + 0.4 * mod.averageEngagement + 0.2 * mod.averageConfidence;
      if (score > highestScore) {
        highestScore = score;
        bestModality = mod.activityType;
      }
    }

    return bestModality;
  }

  /**
   * Learns optimal session duration dynamically.
   */
  async calculateOptimalSessionDuration(
    childId: string,
    currentDuration: number,
    currentEngagement: number
  ): Promise<number> {
    const profile = await learningProfileRepository.findByChildId(childId);
    const currentOptimal = profile?.optimalSessionDuration ?? 15; // default 15 mins

    // Engagement drop threshold < 50 shortening duration
    if (currentEngagement < 50.0 && currentDuration > currentOptimal) {
      const newOptimal = Math.max(10, currentOptimal - 5);
      if (newOptimal !== currentOptimal) {
        await adaptationEventRepository.create({
          childId,
          eventType: AdaptationEventType.SESSION_SHORTENED,
          reason: `Engagement fell to ${currentEngagement.toFixed(0)}% during a ${currentDuration} min session. Optimal shortened from ${currentOptimal} to ${newOptimal} mins.`,
          metadata: { previousOptimal: currentOptimal, newOptimal },
        });
      }
      return newOptimal;
    }

    // Engagement high threshold > 85 extending duration
    if (currentEngagement > 85.0 && currentDuration >= currentOptimal) {
      const newOptimal = Math.min(45, currentOptimal + 5);
      if (newOptimal !== currentOptimal) {
        await adaptationEventRepository.create({
          childId,
          eventType: AdaptationEventType.SESSION_EXTENDED,
          reason: `High engagement of ${currentEngagement.toFixed(0)}% sustained for a ${currentDuration} min session. Optimal extended from ${currentOptimal} to ${newOptimal} mins.`,
          metadata: { previousOptimal: currentOptimal, newOptimal },
        });
      }
      return newOptimal;
    }

    return currentOptimal;
  }

  /**
   * Evaluates scores and triggers confidence / engagement drop or improvement adaptation events.
   */
  async generateAdaptationEvents(childId: string, performance: any, health: any, previousHealth: any) {
    // 1. Confidence threshold checks
    if (health.confidenceScore < 50.0 && (!previousHealth || previousHealth.confidenceScore >= 50.0)) {
      await adaptationEventRepository.create({
        childId,
        eventType: AdaptationEventType.CONFIDENCE_DROP,
        reason: `Confidence score dropped to ${health.confidenceScore.toFixed(1)} (below 50% threshold).`,
        metadata: { currentScore: health.confidenceScore },
      });
    } else if (health.confidenceScore > 85.0 && (!previousHealth || previousHealth.confidenceScore <= 85.0)) {
      await adaptationEventRepository.create({
        childId,
        eventType: AdaptationEventType.CONFIDENCE_IMPROVEMENT,
        reason: `Confidence score rose to ${health.confidenceScore.toFixed(1)} (exceeding 85% threshold).`,
        metadata: { currentScore: health.confidenceScore },
      });
    }

    // 2. Engagement threshold checks
    if (performance.engagementScore < 50.0 && (!previousHealth || previousHealth.engagementScore >= 50.0)) {
      await adaptationEventRepository.create({
        childId,
        eventType: AdaptationEventType.ENGAGEMENT_DROP,
        reason: `Engagement score fell to ${performance.engagementScore.toFixed(1)} (below 50% threshold).`,
        metadata: { currentScore: performance.engagementScore },
      });
    } else if (performance.engagementScore > 85.0 && (!previousHealth || previousHealth.engagementScore <= 85.0)) {
      await adaptationEventRepository.create({
        childId,
        eventType: AdaptationEventType.ENGAGEMENT_IMPROVEMENT,
        reason: `Engagement score rose to ${performance.engagementScore.toFixed(1)} (exceeding 85% threshold).`,
        metadata: { currentScore: performance.engagementScore },
      });
    }
  }

  /**
   * Refreshes the child profile summary and saves to database.
   */
  async updateLearningProfile(childId: string, nextOptimalDuration?: number, lastVelocity?: number) {
    const modalities = await modalityPerformanceRepository.findByChild(childId);
    if (modalities.length === 0) {
      return;
    }

    let totalAccuracy = 0;
    let totalEngagement = 0;
    let totalConfidence = 0;

    for (const mod of modalities) {
      totalAccuracy += mod.averageAccuracy;
      totalEngagement += mod.averageEngagement;
      totalConfidence += mod.averageConfidence;
    }

    const count = modalities.length;
    const averageAccuracy = totalAccuracy / count;
    const averageEngagement = totalEngagement / count;
    const averageConfidence = totalConfidence / count;

    const preferredModality = await this.calculatePreferredModality(childId);
    const profile = await learningProfileRepository.findByChildId(childId);

    const optimalSessionDuration = nextOptimalDuration ?? profile?.optimalSessionDuration ?? 15;
    const learningVelocity = lastVelocity ?? profile?.learningVelocity ?? 0.0;

    // Check preferred modality shift
    if (profile && profile.preferredModality !== preferredModality) {
      await adaptationEventRepository.create({
        childId,
        eventType: AdaptationEventType.MODALITY_CHANGE,
        reason: `Preferred learning modality changed from ${profile.preferredModality} to ${preferredModality}.`,
        metadata: { previousModality: profile.preferredModality, newModality: preferredModality },
      });
    }

    return learningProfileRepository.upsert(childId, {
      averageAccuracy,
      averageEngagement,
      averageConfidence,
      optimalSessionDuration,
      preferredModality,
      learningVelocity,
    });
  }

  /**
   * Recommends modality.
   */
  async recommendModality(childId: string): Promise<ActivityType> {
    const profile = await learningProfileRepository.findByChildId(childId);
    return profile?.preferredModality ?? ActivityType.VIDEO;
  }

  /**
   * Recommends optimal session duration.
   */
  async recommendSessionDuration(childId: string): Promise<number> {
    const profile = await learningProfileRepository.findByChildId(childId);
    return profile?.optimalSessionDuration ?? 15;
  }

  /**
   * Primary entry point. Triggered when child completes practice, orchestrating adaptive changes.
   */
  async processChildPerformance(
    childId: string,
    performance: {
      accuracy: number;
      responseTime: number;
      attempts: number;
      retries: number;
      engagementScore: number;
      helpRequests: number;
      sessionDuration: number; // in minutes
      activityType: ActivityType;
      skillId: string;
    },
    health: any,
    previousHealth: any
  ) {
    const durationMins = Math.round(performance.sessionDuration);

    // 1. Ingest append-only learning event history
    await learningEventRepository.create({
      childId,
      eventType: 'PRACTICE_SESSION',
      value: performance.accuracy,
      metadata: {
        activityType: performance.activityType,
        skillId: performance.skillId,
        responseTime: performance.responseTime,
        engagementScore: performance.engagementScore,
        sessionDuration: durationMins,
      },
    });

    // 2. Modality Analysis
    await this.analyzePerformance(
      childId,
      performance.activityType,
      performance.accuracy,
      performance.engagementScore,
      health.confidenceScore
    );

    // 3. Score checks & adaptation event triggers
    await this.detectWeaknesses(childId, performance.skillId, health.masteryScore);
    await this.detectStrengths(childId, performance.skillId, health.masteryScore);
    await this.generateAdaptationEvents(childId, performance, health, previousHealth);

    if (previousHealth) {
      await this.detectRegression(childId, performance.skillId, previousHealth.masteryScore, health.masteryScore);
    }

    // 4. Calculate learning velocity and session optimal length
    const velocity = await this.calculateLearningVelocity(childId, performance.skillId, health.masteryScore);
    const optimalDuration = await this.calculateOptimalSessionDuration(
      childId,
      durationMins,
      performance.engagementScore
    );

    // 5. Update Learning Profile summary
    const updatedProfile = await this.updateLearningProfile(childId, optimalDuration, velocity);
    return {
      profile: updatedProfile,
      velocity,
      optimalDuration,
    };
  }
}

export const adaptiveLearningEngineService = new AdaptiveLearningEngineService();
