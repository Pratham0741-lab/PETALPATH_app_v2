import { MasteryState, ActivityType, ReinforcementEventType } from '../../shared/enums.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { reinforcementQueueRepository } from './repositories/reinforcement-queue.repository.js';
import { reinforcementHistoryRepository } from './repositories/reinforcement-history.repository.js';
import { reinforcementEventRepository } from './repositories/reinforcement-event.repository.js';
import { skillHealthRepository } from '../mastery/repositories/skill-health.repository.js';
import {
  cadenceDaysFor,
  describeReviewCause,
  needsReview,
  nextReviewDateFor,
  projectDecayedHealth,
  reviewPriority,
  type ReviewCause,
} from '../mastery/review-cadence.js';
import { learningProfileRepository } from '../adaptive/repositories/learning-profile.repository.js';
import { modalityTelemetryService } from '../adaptive/modality-telemetry.service.js';
import { logger } from '../../utils/logger.js';
import { Prisma } from '@prisma/client';

/**
 * Modality rotation sequence, used to avoid repeating the same activity type in
 * consecutive reviews. Reads the config copy rather than restating it — this was
 * a private literal identical to `engineConfig.reinforcement.modalityRotation`,
 * and a second copy of a table is how the four rival cadence tables started.
 */
const MODALITY_ROTATION: readonly ActivityType[] = engineConfig.reinforcement.modalityRotation;

export class ReinforcementEngineService {
  // ──────────────────────────────────────────────
  //  PRIORITY CALCULATION
  // ──────────────────────────────────────────────

  /**
   * priority = 0.5 × masteryGap + 0.3 × retentionGap + 0.2 × confidenceGap,
   * +20 if masteryScore < 50, plus a boost for *why* the skill was queued.
   *
   * Delegates to `review-cadence.ts::reviewPriority`. The formula is unchanged;
   * what is new is the optional `cause` (a regression outranks a skill that was
   * simply never finished) and the clamp to `priorityClampMax`, which until now
   * sat in config with no reader.
   */
  calculatePriority(
    masteryScore: number,
    retentionScore: number,
    confidenceScore: number,
    cause?: ReviewCause,
  ): number {
    return reviewPriority({ masteryScore, retentionScore, confidenceScore, cause });
  }

  // ──────────────────────────────────────────────
  //  REVIEW SCHEDULING
  // ──────────────────────────────────────────────

  /**
   * WEAK → 1 day, STRONG → 2 days, MASTERED → 3 days; 1 for NEW / LEARNING.
   *
   * The table itself now lives in `unified.review.cadenceDaysByState`, shared
   * with the mastery engine and the adaptive-planning queue — three copies of
   * these numbers used to disagree.
   */
  calculateFrequencyDays(masteryState: MasteryState): number {
    return cadenceDaysFor(masteryState);
  }

  /**
   * The next review date — the **start of** the local day `frequencyDays` from
   * now, not `now + N × 24h`. A review earned at bedtime is then waiting at
   * breakfast instead of at bedtime tomorrow.
   */
  calculateNextReviewDate(masteryState: MasteryState, fromDate?: Date): Date {
    return nextReviewDateFor(masteryState, fromDate ?? new Date()).nextReviewDate;
  }

  // ──────────────────────────────────────────────
  //  QUEUE MANAGEMENT
  // ──────────────────────────────────────────────

  /**
   * Enqueue a single skill. Upserts to avoid duplicates.
   * Fires REVIEW_TRIGGERED event on new entries.
   *
   * `health.cause` is optional and defaults to MASTERY_GAP, so the existing
   * callers behave as before. Supplying it is what makes the row's `reason`
   * true: that string is shown to the parent, and every row used to read
   * "Mastery score 43.2 is below 85% reinforcement threshold." whether the child
   * had regressed, gone stale, or simply not finished yet.
   */
  async enqueueSkill(
    childId: string,
    skillId: string,
    health: {
      masteryScore: number;
      retentionScore: number;
      confidenceScore: number;
      masteryState: MasteryState;
      /** Why this skill is being queued. Sets the priority boost and the reason. */
      cause?: ReviewCause;
      /** Used in the reason so a parent reads a skill name, not an id. */
      skillTitle?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const cause: ReviewCause = health.cause ?? 'MASTERY_GAP';
    const priority = this.calculatePriority(
      health.masteryScore,
      health.retentionScore,
      health.confidenceScore,
      cause,
    );
    const nextReviewDate = this.calculateNextReviewDate(health.masteryState);

    const existing = await reinforcementQueueRepository.findByChildAndSkill(childId, skillId, tx);

    const entry = await reinforcementQueueRepository.upsert(childId, skillId, {
      priority,
      masteryState: health.masteryState,
      reason: describeReviewCause(cause, health.skillTitle),
      nextReviewDate,
    }, tx);

    // Only fire event if this is a new queue entry
    if (!existing || existing.isCompleted) {
      await reinforcementEventRepository.create({
        childId,
        skillId,
        eventType: ReinforcementEventType.REVIEW_TRIGGERED,
        metadata: {
          priority,
          cause,
          masteryScore: health.masteryScore,
          nextReviewDate: nextReviewDate.toISOString(),
        },
      }, tx);
    }

    return entry;
  }

  /**
   * Scans a child's skill health and enqueues everything not yet healthy,
   * removing skills that have recovered.
   *
   * Two corrections here. First, the judgement is made on **decayed** scores:
   * nothing in this backend ages a `SkillHealth` row (there is no scheduler), so
   * a stored 86 from two months ago used to read as permanently finished.
   * `projectDecayedHealth` applies the same decay curve the write path uses.
   *
   * Second, the recovery branch used to issue a `markCompleted` write for every
   * healthy skill on every call — potentially hundreds of pointless updates. The
   * active queue is now read once, and only rows actually in it are touched.
   */
  async detectWeakSkills(childId: string, now: Date = new Date()) {
    const allHealth = await skillHealthRepository.findByChild(childId);
    const queued = new Set(
      (await reinforcementQueueRepository.findByChild(childId)).map((q) => q.skillId)
    );
    const enqueued: string[] = [];
    const removed: string[] = [];

    for (const health of allHealth) {
      const today = projectDecayedHealth(health, now);

      if (needsReview(health, now)) {
        await this.enqueueSkill(childId, health.skillId, {
          masteryScore: today.masteryScore,
          retentionScore: today.retentionScore,
          confidenceScore: today.confidenceScore,
          masteryState: today.masteryState,
          cause: today.retentionScore < engineConfig.reinforcement.retentionDropThreshold
            ? 'RETENTION_DROP'
            : 'MASTERY_GAP',
        });
        enqueued.push(health.skillId);
      } else if (queued.has(health.skillId)) {
        // Recovered, and actually in the queue — take it out.
        await this.removeCompletedSkill(childId, health.skillId);
        removed.push(health.skillId);
      }
    }

    return { enqueued, removed };
  }

  /**
   * Skills due for review (nextReviewDate ≤ now), highest priority first.
   *
   * The stored dates are local midnights, so this timestamp comparison agrees
   * with `review-cadence.ts::isReviewDue`'s day-index comparison: a review set
   * for tomorrow becomes due the instant the child's tomorrow begins.
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
  async removeCompletedSkill(childId: string, skillId: string, tx?: Prisma.TransactionClient) {
    await reinforcementQueueRepository.markCompleted(childId, skillId, tx);
  }

  // ──────────────────────────────────────────────
  //  MODALITY ROTATION
  // ──────────────────────────────────────────────

  /**
   * Picks the activity type for a reinforcement review.
   *
   * ## What this used to do, and why it never did it
   *
   * The intent was "start from the child's preferred modality". The
   * implementation read `LearningProfile`, a table with **no writer on any path
   * the app can reach** — so `profile` was always null, `preferred` was always
   * `defaultFallbackModality`, and every review ever offered to every child was a
   * video. The rotation below existed to avoid repeating a modality and, given a
   * constant input, never had anything to rotate away from.
   *
   * ## What it does now, in order
   *
   * 1. **The child's weakest modality**, when the evidence names one. A review is
   *    remedial practice, so the useful thing to practice is the way of working
   *    they find hardest — not, as every aggregation in this codebase previously
   *    computed, the one they are already best at.
   * 2. **Their preferred modality**, when there is no weakest. This is the
   *    original intent, and it now has real data behind it: `lesson-completion`
   *    writes `ModalityPerformance` on every pass.
   * 3. **Rotation**, unchanged, whenever step 1 or 2 lands on whatever was used
   *    last time for this skill.
   *
   * `profile.weakest` is deliberately null far more often than not — a modality
   * with one observation, or four modalities within five points of each other,
   * yield no weakest. Treating null as "no opinion" rather than as a weakness is
   * the difference between adaptation and superstition; see
   * `modules/adaptive/modality-profile.ts`.
   */
  async selectActivityType(childId: string, skillId: string): Promise<ActivityType> {
    const [profile, recent] = await Promise.all([
      modalityTelemetryService.getProfile(childId),
      reinforcementHistoryRepository.findRecent(childId, skillId),
    ]);
    const lastUsed = (recent?.activityType as ActivityType | undefined) ?? null;

    // 1. Practice the hard thing — unless that is exactly what they just did.
    if (profile?.weakest && profile.weakest !== lastUsed) {
      return profile.weakest;
    }

    /*
     * 2. No evidenced weakness. Fall back to the preferred modality, still
     *    reading the legacy `LearningProfile` row when no per-modality rows exist
     *    yet: `POST /adaptive/process` and `/adaptation/analyze` do write that
     *    row, and a child who has been through either should not be reset.
     */
    let preferred = profile?.preferred ?? null;
    if (!preferred) {
      const legacy = await learningProfileRepository.findByChildId(childId);
      preferred = (legacy?.preferredModality as ActivityType | undefined) ?? null;
    }
    preferred = preferred ?? engineConfig.reinforcement.defaultFallbackModality;

    if (lastUsed !== preferred) {
      return preferred;
    }

    // 3. Rotate to the next modality in the sequence.
    const currentIndex = MODALITY_ROTATION.indexOf(lastUsed);
    const nextIndex = (currentIndex + 1) % MODALITY_ROTATION.length;
    const candidate = MODALITY_ROTATION[nextIndex];

    // If rotation lands back on the same, skip one more.
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
   *
   * ## `manageQueue`
   *
   * Step 4 assumes this method is the only thing deciding queue membership,
   * which was true while the only caller was the standalone reinforcement API.
   * It is not true on the lesson path: `mastery-engine.evaluateMastery` has
   * already scored the session inside a transaction and either re-enqueued the
   * skill (with tomorrow's date and the right cause) or removed it once
   * genuinely mastered. Left to itself, step 4 would then *undo* that — any
   * review that improved the score at all counts as "success" here, so a skill
   * that went 40 → 45 and is still WEAK would be marked complete and never come
   * back.
   *
   * Passing `manageQueue: false` keeps the recording half — history, events, the
   * before/after numbers — and leaves membership to whichever engine holds the
   * mastery write. Rule of thumb: whoever wrote `SkillHealth` owns the queue row.
   */
  async processReinforcement(
    childId: string,
    skillId: string,
    beforeScore: number,
    afterScore: number,
    activityType: ActivityType,
    options: { manageQueue?: boolean } = {},
  ) {
    const manageQueue = options.manageQueue ?? true;
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

      if (manageQueue) {
        // Remove from queue — skill was successfully reinforced
        await this.removeCompletedSkill(childId, skillId);
      }

      logger.info(
        { childId, skillId, scoreDifference, manageQueue },
        manageQueue
          ? 'Reinforcement success — skill removed from queue'
          : 'Reinforcement success — queue left to the mastery write',
      );
    } else {
      await reinforcementEventRepository.create({
        childId,
        skillId,
        eventType: ReinforcementEventType.REINFORCEMENT_FAILED,
        metadata: { scoreDifference, afterScore },
      });

      if (manageQueue) {
        // Re-enqueue with updated priority from current health
        const health = await skillHealthRepository.findByChildAndSkill(childId, skillId);
        if (health) {
          // A review that went backwards by more than the regression threshold is
          // a different problem from one that merely failed to improve, and the
          // queue is ordered by priority — so say which it was.
          const slipped = beforeScore - afterScore > engineConfig.mastery.regressionDropThreshold;
          await this.enqueueSkill(childId, skillId, {
            masteryScore: health.masteryScore,
            retentionScore: health.retentionScore,
            confidenceScore: health.confidenceScore,
            masteryState: health.masteryState,
            cause: slipped ? 'REGRESSION' : 'MASTERY_GAP',
          });
        }
      }

      logger.info(
        { childId, skillId, scoreDifference, manageQueue },
        manageQueue
          ? 'Reinforcement failed — skill re-enqueued with updated priority'
          : 'Reinforcement failed — queue left to the mastery write',
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
   * Fires a RETENTION_DROP event when retention has fallen below the threshold.
   *
   * This method existed with **no callers at all** — the one signal the engine
   * had for "this is fading" was never emitted. `mastery-engine.service.ts` now
   * calls it inside the scoring transaction, hence the `tx`, and the return
   * value says whether it fired so the caller can pick the enqueue cause without
   * re-deriving the threshold.
   */
  async detectRetentionDrop(
    childId: string,
    skillId: string,
    retentionScore: number,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    if (retentionScore >= engineConfig.reinforcement.retentionDropThreshold) {
      return false;
    }

    await reinforcementEventRepository.create({
      childId,
      skillId,
      eventType: ReinforcementEventType.RETENTION_DROP,
      metadata: { retentionScore },
    }, tx);

    return true;
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
