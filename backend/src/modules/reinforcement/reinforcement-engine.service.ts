import { MasteryState, ActivityType, ReinforcementEventType } from '../../shared/enums.js';
import { reinforcementQueueRepository } from './repositories/reinforcement-queue.repository.js';
import { reinforcementHistoryRepository } from './repositories/reinforcement-history.repository.js';
import { reinforcementEventRepository } from './repositories/reinforcement-event.repository.js';
import { skillHealthRepository } from '../mastery/repositories/skill-health.repository.js';
import { learningProfileRepository } from '../adaptive/repositories/learning-profile.repository.js';
import { logger } from '../../utils/logger.js';

/**
 * Modality rotation sequence. The engine cycles through these to avoid
 * repeating the same activity type in consecutive reviews.
 */
const MODALITY_ROTATION: ActivityType[] = [
  ActivityType.VIDEO,
  ActivityType.GAME,
  ActivityType.SPEAKING,
  ActivityType.STORY,
  ActivityType.WRITING,
];

export class ReinforcementEngineService {
  // ──────────────────────────────────────────────
  //  PRIORITY CALCULATION
  // ──────────────────────────────────────────────

  /**
   * priority = 0.5 × masteryGap + 0.3 × retentionGap + 0.2 × confidenceGap
   * Boost +20 if masteryScore < 50.
   * Range: 0–120 (100 base + 20 boost).
   */
  calculatePriority(masteryScore: number, retentionScore: number, confidenceScore: number): number {
    const masteryGap = 100 - masteryScore;
    const retentionGap = 100 - retentionScore;
    const confidenceGap = 100 - confidenceScore;

    let priority = 0.5 * masteryGap + 0.3 * retentionGap + 0.2 * confidenceGap;

    if (masteryScore < 50) {
      priority += 20;
    }

    return Math.round(priority * 100) / 100; // Two decimal places
  }

  // ──────────────────────────────────────────────
  //  REVIEW SCHEDULING
  // ──────────────────────────────────────────────

  /**
   * WEAK → 1 day, STRONG → 2 days, MASTERED → 3 days.
   * Defaults to 1 for NEW / LEARNING states.
   */
  calculateFrequencyDays(masteryState: MasteryState): number {
    switch (masteryState) {
      case MasteryState.WEAK:
        return 1;
      case MasteryState.STRONG:
        return 2;
      case MasteryState.MASTERED:
        return 3;
      default:
        return 1;
    }
  }

  /**
   * nextReviewDate = today + frequencyDays.
   */
  calculateNextReviewDate(masteryState: MasteryState, fromDate?: Date): Date {
    const base = fromDate ?? new Date();
    const frequencyDays = this.calculateFrequencyDays(masteryState);
    return new Date(base.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
  }

  // ──────────────────────────────────────────────
  //  QUEUE MANAGEMENT
  // ──────────────────────────────────────────────

  /**
   * Enqueue a single skill. Upserts to avoid duplicates.
   * Fires REVIEW_TRIGGERED event on new entries.
   */
  async enqueueSkill(
    childId: string,
    skillId: string,
    health: {
      masteryScore: number;
      retentionScore: number;
      confidenceScore: number;
      masteryState: MasteryState;
    }
  ) {
    const priority = this.calculatePriority(
      health.masteryScore,
      health.retentionScore,
      health.confidenceScore
    );
    const nextReviewDate = this.calculateNextReviewDate(health.masteryState);

    const existing = await reinforcementQueueRepository.findByChildAndSkill(childId, skillId);

    const entry = await reinforcementQueueRepository.upsert(childId, skillId, {
      priority,
      masteryState: health.masteryState,
      reason: `Mastery score ${health.masteryScore.toFixed(1)} is below 85% reinforcement threshold.`,
      nextReviewDate,
    });

    // Only fire event if this is a new queue entry
    if (!existing || existing.isCompleted) {
      await reinforcementEventRepository.create({
        childId,
        skillId,
        eventType: ReinforcementEventType.REVIEW_TRIGGERED,
        metadata: {
          priority,
          masteryScore: health.masteryScore,
          nextReviewDate: nextReviewDate.toISOString(),
        },
      });
    }

    return entry;
  }

  /**
   * Scans all skill health records for a child and enqueues skills
   * with masteryScore < 85. Removes skills that have recovered.
   */
  async detectWeakSkills(childId: string) {
    const allHealth = await skillHealthRepository.findByChild(childId);
    const enqueued: string[] = [];
    const removed: string[] = [];

    for (const health of allHealth) {
      if (health.masteryScore < 85.0) {
        await this.enqueueSkill(childId, health.skillId, {
          masteryScore: health.masteryScore,
          retentionScore: health.retentionScore,
          confidenceScore: health.confidenceScore,
          masteryState: health.masteryState,
        });
        enqueued.push(health.skillId);
      } else {
        // Skill recovered — remove from queue
        await this.removeCompletedSkill(childId, health.skillId);
        removed.push(health.skillId);
      }
    }

    return { enqueued, removed };
  }

  /**
   * Returns skills due for review (nextReviewDate ≤ now), sorted by priority desc.
   */
  async getDueSkills(childId: string) {
    return reinforcementQueueRepository.findDueSkills(childId, new Date());
  }

  /**
   * Returns the full active (non-completed) queue for a child.
   */
  async getQueue(childId: string) {
    return reinforcementQueueRepository.findByChild(childId);
  }

  /**
   * Marks a skill as completed and removes it from the active queue.
   */
  async removeCompletedSkill(childId: string, skillId: string) {
    await reinforcementQueueRepository.removeByChildAndSkill(childId, skillId);
  }

  // ──────────────────────────────────────────────
  //  MODALITY ROTATION
  // ──────────────────────────────────────────────

  /**
   * Selects the next activity type for a reinforcement review.
   *
   * 1. Starts from the child's preferred modality (from Adaptive Engine).
   * 2. Avoids repeating the same modality as the last reinforcement attempt.
   * 3. Rotates through MODALITY_ROTATION sequence.
   */
  async selectActivityType(childId: string, skillId: string): Promise<ActivityType> {
    // Get preferred modality from the Adaptive Engine's learning profile
    const profile = await learningProfileRepository.findByChildId(childId);
    const preferred = profile?.preferredModality ?? ActivityType.VIDEO;

    // Get the most recent reinforcement attempt for this skill
    const recent = await reinforcementHistoryRepository.findRecent(childId, skillId);
    const lastUsed = recent?.activityType ?? null;

    // If preferred modality wasn't used last time, use it
    if (lastUsed !== preferred) {
      return preferred;
    }

    // Otherwise, rotate to the next modality in the sequence
    const currentIndex = MODALITY_ROTATION.indexOf(lastUsed);
    const nextIndex = (currentIndex + 1) % MODALITY_ROTATION.length;
    const candidate = MODALITY_ROTATION[nextIndex];

    // If rotation lands back on the same, skip one more
    if (candidate === lastUsed) {
      return MODALITY_ROTATION[(nextIndex + 1) % MODALITY_ROTATION.length];
    }

    return candidate;
  }

  // ──────────────────────────────────────────────
  //  REINFORCEMENT PROCESSING
  // ──────────────────────────────────────────────

  /**
   * Primary entry point for recording a reinforcement review result.
   *
   * Called after a child completes a review activity:
   * 1. Records history (append-only).
   * 2. Detects success/failure.
   * 3. Fires events.
   * 4. Removes from queue on success; updates priority on failure.
   */
  async processReinforcement(
    childId: string,
    skillId: string,
    beforeScore: number,
    afterScore: number,
    activityType: ActivityType
  ) {
    const scoreDifference = afterScore - beforeScore;
    const success = scoreDifference > 0;

    // 1. Append history record
    const historyRecord = await reinforcementHistoryRepository.create({
      childId,
      skillId,
      activityType,
      beforeScore,
      afterScore,
      scoreDifference,
      success,
    });

    // 2. Fire REVIEW_COMPLETED event
    await reinforcementEventRepository.create({
      childId,
      skillId,
      eventType: ReinforcementEventType.REVIEW_COMPLETED,
      metadata: { beforeScore, afterScore, scoreDifference, activityType },
    });

    // 3. Fire success/failure event
    if (success) {
      await reinforcementEventRepository.create({
        childId,
        skillId,
        eventType: ReinforcementEventType.REINFORCEMENT_SUCCESS,
        metadata: { scoreDifference, afterScore },
      });

      // Remove from queue — skill was successfully reinforced
      await this.removeCompletedSkill(childId, skillId);

      logger.info(
        { childId, skillId, scoreDifference },
        'Reinforcement success — skill removed from queue'
      );
    } else {
      await reinforcementEventRepository.create({
        childId,
        skillId,
        eventType: ReinforcementEventType.REINFORCEMENT_FAILED,
        metadata: { scoreDifference, afterScore },
      });

      // Re-enqueue with updated priority from current health
      const health = await skillHealthRepository.findByChildAndSkill(childId, skillId);
      if (health) {
        await this.enqueueSkill(childId, skillId, {
          masteryScore: health.masteryScore,
          retentionScore: health.retentionScore,
          confidenceScore: health.confidenceScore,
          masteryState: health.masteryState,
        });
      }

      logger.info(
        { childId, skillId, scoreDifference },
        'Reinforcement failed — skill re-enqueued with updated priority'
      );
    }

    return {
      history: historyRecord,
      success,
      scoreDifference,
    };
  }

  // ──────────────────────────────────────────────
  //  RETENTION DROP DETECTION
  // ──────────────────────────────────────────────

  /**
   * Detects retention drops and fires RETENTION_DROP events.
   * Called by the Mastery/Adaptive pipeline when retention decays significantly.
   */
  async detectRetentionDrop(childId: string, skillId: string, retentionScore: number) {
    if (retentionScore < 50.0) {
      await reinforcementEventRepository.create({
        childId,
        skillId,
        eventType: ReinforcementEventType.RETENTION_DROP,
        metadata: { retentionScore },
      });
    }
  }

  // ──────────────────────────────────────────────
  //  READ-ONLY ACCESSORS
  // ──────────────────────────────────────────────

  async getHistory(childId: string, limit = 50) {
    return reinforcementHistoryRepository.findByChild(childId, limit);
  }

  async getEvents(childId: string, limit = 50) {
    return reinforcementEventRepository.findByChild(childId, limit);
  }
}

export const reinforcementEngineService = new ReinforcementEngineService();
