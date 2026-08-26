/**
 * The one path a lesson completes through.
 *
 * `POST /progress/complete` used to call `forceCompleteLesson` — a method whose
 * own docblock says "Admin/Testing/Recovery … bypasses standard interactive
 * learner flows". It set all four activity flags true, invented stars for any
 * activity the child had not done, wrote `KnowledgeState.mastery = 80` (the
 * curriculum's `required_score`, the same constant for all 1209 nodes), and
 * never called the adaptive engine. The engine's only other call site is the
 * camera sync service, so in practice mastery was a constant and the "adaptive"
 * unlock gate reduced to "did you press Complete".
 *
 * This service replaces it for learner traffic. It reads what the child actually
 * did, scores it once through the engine, and writes both stores the rest of the
 * system reads — inside a single transaction, so the lesson can never be marked
 * complete with the mastery write missing.
 *
 * ## Why two mastery stores still exist, and what each now means
 *
 * They were unreconciled; now they have distinct jobs.
 *
 * - `SkillHealth.masteryScore` — the **live** score. It decays with time and is
 *   what decides when a skill comes back for review.
 * - `KnowledgeState.mastery` — the **high-water mark**, and the only thing the
 *   unlock gate reads. A lesson the child has already opened must not re-lock
 *   overnight because retention decayed; decay schedules practice, it does not
 *   confiscate progress.
 *
 * ## What this deliberately does *not* do
 *
 * It does not refuse completion. A child who finishes only part of a lesson is
 * still recorded as complete — exactly as today — but scores low, lands in WEAK,
 * and is queued for review tomorrow. Blocking completion on a score would let a
 * scoring bug strand a five-year-old mid-lesson; the score's job is to decide
 * what comes *next*, not to withhold the ending.
 */

import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { ActivityType } from '../../shared/enums.js';
import { curriculumService } from '../curriculum/index.js';
import { starService } from '../stars/star.service.js';
import { rewardService } from '../rewards/rewards.service.js';
import { moduleProgressService } from './module-progress.service.js';
import { categoryProgressService } from './category-progress.service.js';
import { progressService } from './progress.service.js';
import { masteryEngineService } from '../mastery-engine/mastery-engine.service.js';
import { skillRoadmapService } from '../skill-roadmap/skill-roadmap.service.js';
import { reinforcementEngineService } from '../reinforcement/reinforcement-engine.service.js';
import { modalityTelemetryService } from '../adaptive/modality-telemetry.service.js';
import { isReviewDue } from '../mastery/review-cadence.js';
import { projectMasteryToKnowledgeState } from './knowledge-state.writer.js';
import {
  ACTIVITY_TYPE_OF,
  computeLessonEvidence,
  expectedModalitiesOf,
  gatherModalitySignals,
  perModalitySamples,
  MODALITY_KEYS,
  type LessonEvidence,
  type ModalityKey,
  type ModalitySignal,
} from './lesson-evidence.js';

/**
 * Which modality this pass is recorded under: the last one the child actually
 * touched.
 *
 * A lesson is up to four activities, so any single label is a simplification.
 * This is the useful one — `reinforcement-engine.selectActivityType` reads the
 * most recent history row to avoid offering the same modality twice in a row.
 * (The per-modality picture is not lost: `perModalitySamples` keeps all four, and
 * step 8 folds them into the child's modality profile.)
 */
function modalityPracticed(signals: readonly ModalitySignal[]): ActivityType {
  let latest: ModalitySignal | null = null;
  for (const signal of signals) {
    if (!signal.attempted) continue;
    if (
      !latest ||
      (signal.lastActivityAt?.getTime() ?? 0) > (latest.lastActivityAt?.getTime() ?? 0)
    ) {
      latest = signal;
    }
  }
  return ACTIVITY_TYPE_OF[latest?.modality ?? 'video'];
}

export interface CompleteLessonResult {
  // ---- preserved response contract (the app reads these) ----
  progress: unknown;
  becameCompleted: boolean;
  moduleCompleted: boolean;
  categoryCompleted: boolean;
  starsEarned: number;
  totalStars: number;
  // ---- additive: what the engine decided ----
  mastery: {
    score: number;
    state: string;
    previousScore: number | null;
    delta: number;
    proven: boolean;
    nextReviewDate: string | null;
    isRegression: boolean;
    unlockedSkills: string[];
  } | null;
  evidence: {
    accuracy: number;
    engagement: number;
    attempts: number;
    retries: number;
    expectedActivities: number;
    completedActivities: number;
    sessionsWithEvidence: number;
    requiredSessions: number;
  };
}

export class LessonCompletionService {
  /**
   * Completes a lesson for a learner: measure, score, persist, schedule.
   */
  async completeLesson(childId: string, lessonId: string): Promise<CompleteLessonResult> {
    const lessonNode = curriculumService.getLessonById(lessonId);
    if (!lessonNode) {
      throw new NotFoundError('Lesson not found in curriculum');
    }

    const expectedModalities = expectedModalitiesOf(lessonNode.activities);
    const now = new Date();

    const outcome = await prisma.$transaction(async (tx) => {
      const existingProgress = await tx.lessonProgress.findUnique({
        where: { childId_lessonId: { childId, lessonId } },
      });

      // ---- 1. measure -----------------------------------------------------
      const signals = await gatherModalitySignals(
        childId,
        lessonId,
        expectedModalities,
        existingProgress,
        tx
      );

      const previousHealth = await tx.skillHealth.findUnique({
        where: { childId_skillId: { childId, skillId: lessonId } },
      });

      /*
       * Was this pass a review the engine had asked for?
       *
       * It has to be read here, *before* `evaluateMastery`, because that call
       * rewrites this very row inside the same transaction — by the time it
       * returns, every completion looks like a fresh enqueue. The three
       * conditions are: the child had finished this lesson before, a live queue
       * row exists, and it had come due. (`isReviewDue` compares local calendar
       * days; it agrees with the `nextReviewDate <= now` that the roadmap's
       * `findDueSkills` runs in SQL, because every date this system stores is a
       * local midnight.)
       */
      const queuedReview = await tx.reinforcementQueue.findUnique({
        where: { childId_skillId: { childId, skillId: lessonId } },
        select: { isCompleted: true, nextReviewDate: true },
      });
      const isReviewPass =
        existingProgress?.status === 'COMPLETED' &&
        !!queuedReview &&
        !queuedReview.isCompleted &&
        isReviewDue(queuedReview.nextReviewDate, now);

      const evidence = computeLessonEvidence({
        expectedModalities,
        signals,
        priorAttemptTotal: previousHealth?.attemptCount ?? 0,
        priorSessions: previousHealth?.reviewCount ?? 0,
        requiredAttempts: lessonNode.mastery?.attempts ?? null,
        difficulty: lessonNode.difficulty ?? null,
        estimatedMinutes: lessonNode.estimated_minutes,
        helpRequests: 0,
      });

      // ---- 2. score -------------------------------------------------------
      // The engine keys on `Skill`, which `prisma/seed.ts` mirrors from the
      // curriculum using the same slug ids, so this normally exists. When it
      // does not (a standalone or demo lesson), the lesson still completes and
      // we say so in the log rather than swallowing it — the previous empty
      // `catch {}` meant a broken engine looked exactly like a working one.
      const skill = await tx.skill.findUnique({ where: { id: lessonId }, select: { id: true } });

      let masteryResult: Awaited<ReturnType<typeof masteryEngineService.evaluateMastery>> | null = null;
      if (skill) {
        masteryResult = await masteryEngineService.evaluateMastery(
          {
            childId,
            skillId: lessonId,
            accuracy: evidence.accuracy,
            responseTime: evidence.responseTime,
            attempts: evidence.attempts,
            retries: evidence.retries,
            engagementScore: evidence.engagementScore,
            helpRequests: evidence.helpRequests,
            sessionDuration: evidence.sessionDuration,
            masteryProven: evidence.masteryProven,
            timestamp: now.toISOString(),
          },
          tx
        );
      } else {
        logger.warn(
          { childId, lessonId },
          'No Skill row for this lesson id — completing without an adaptive evaluation'
        );
      }

      // ---- 3. persist the gate's view -------------------------------------
      // One shared writer, so this path and the per-activity path in
      // `progress.service` can never disagree about what the gate sees.
      const projection = await projectMasteryToKnowledgeState(
        {
          childId,
          topicId: lessonId,
          evidence,
          signals,
          masteryScore: masteryResult?.masteryScore ?? null,
          masteryState: masteryResult?.currentState ?? null,
          confidenceScore: masteryResult?.confidenceScore ?? null,
          now,
        },
        tx
      );

      // ---- 4. record the lesson itself ------------------------------------
      // Real stars only. `forceCompleteLesson` substituted a per-modality
      // default for anything missing, which is how synthetic star data got into
      // the same column the parent dashboard reports on.
      const starsOf: Record<ModalityKey, number> = {
        video: existingProgress?.videoStars ?? 0,
        listen: existingProgress?.listenStars ?? 0,
        speak: existingProgress?.speakStars ?? 0,
        write: existingProgress?.writeStars ?? 0,
      };
      for (const signal of signals) {
        if (signal.stars > starsOf[signal.modality]) {
          starsOf[signal.modality] = signal.stars;
        }
      }
      const totalStars = MODALITY_KEYS.reduce((sum, key) => sum + starsOf[key], 0);

      const becameCompleted = existingProgress?.status !== 'COMPLETED';
      const completionFlags = {
        videoCompleted: signals.find((s) => s.modality === 'video')?.completed ?? false,
        listenCompleted: signals.find((s) => s.modality === 'listen')?.completed ?? false,
        speakCompleted: signals.find((s) => s.modality === 'speak')?.completed ?? false,
        writeCompleted: signals.find((s) => s.modality === 'write')?.completed ?? false,
      };

      const updateData = {
        status: 'COMPLETED',
        ...completionFlags,
        videoStars: starsOf.video,
        listenStars: starsOf.listen,
        speakStars: starsOf.speak,
        writeStars: starsOf.write,
        totalStars,
        completedAt: existingProgress?.completedAt ?? now,
      };

      const progress = existingProgress
        ? await tx.lessonProgress.update({ where: { id: existingProgress.id }, data: updateData })
        : await tx.lessonProgress.create({ data: { childId, lessonId, ...updateData } });

      const newTotalStars = await starService.updateTotalStars(childId, tx);

      // ---- 5. downstream progression --------------------------------------
      let moduleCompleted = false;
      let categoryCompleted = false;

      if (becameCompleted) {
        if (lessonNode.reward) {
          const rewardTitle = `Lesson Completed: ${lessonNode.id}`;
          const existingReward = await tx.reward.findFirst({ where: { childId, title: rewardTitle } });
          if (!existingReward) {
            await tx.reward.create({
              data: {
                childId,
                title: rewardTitle,
                description: `Completed "${lessonNode.title}". Earned ${lessonNode.reward.xp} XP and ${lessonNode.reward.coins} coins.`,
                points: lessonNode.reward.xp,
              },
            });
          }
        }

        const lesson = await tx.lesson.findUnique({
          where: { id: lessonId },
          include: { module: true },
        });
        if (lesson) {
          moduleCompleted = await moduleProgressService.completeModule(childId, lesson.moduleId, tx);
          if (moduleCompleted) {
            categoryCompleted = await categoryProgressService.completeCategory(
              childId,
              lesson.module.categoryId,
              tx
            );
          }
        }
        await progressService.checkAndTriggerGradeProgression(childId, lessonId, tx);
      }

      await rewardService.refreshRewards(childId, tx);

      return {
        progress,
        becameCompleted,
        moduleCompleted,
        categoryCompleted,
        starsEarned: totalStars,
        totalStars: newTotalStars,
        evidence,
        masteryResult,
        /**
         * Carried out for step 8. The per-modality measurement is the whole
         * basis of the child's modality profile, and it exists nowhere else —
         * `gatherModalitySignals` runs once, inside this transaction.
         */
        signals,
        gateMastery: projection.mastery,
        previousMastery: projection.previousMastery,
        /**
         * Non-null only when the child has just done something the engine asked
         * them to redo. Carried out of the transaction because the recording
         * itself must happen after commit — see step 7.
         */
        reviewPass: isReviewPass
          ? {
              beforeScore: previousHealth?.masteryScore ?? 0,
              activityType: modalityPracticed(signals),
            }
          : null,
      };
    });

    // ---- 6. after commit ---------------------------------------------------
    // The roadmap refresh uses its own client and could not see the transaction's
    // unlocks from inside it.
    if (outcome.masteryResult?.pendingRoadmapRefresh) {
      try {
        await skillRoadmapService.refreshRoadmap(childId, 'SKILL_MASTERED');
      } catch (error) {
        logger.error({ childId, lessonId, error }, 'Failed to refresh skill roadmap after lesson completion');
      }
    }

    /*
     * ---- 7. close the review loop -----------------------------------------
     *
     * `ReinforcementHistory` is the only append-only record that a review
     * actually happened, and until now nothing on the learner path wrote one:
     * `processReinforcement` was reachable solely through `POST
     * /reinforcement/process`, which the app never calls. So the engine could ask
     * for a review, and had no idea whether the child ever did it — no
     * before/after pair, no REVIEW_COMPLETED event, and no way for the roadmap to
     * count reviews already done today against `maxReviewsPerDay`.
     *
     * After commit, not inside: none of `processReinforcement`'s repositories
     * take a `tx`, so from inside the transaction they would run on a different
     * connection, block on this transaction's own uncommitted `ReinforcementQueue`
     * row, and see a stale `SkillHealth`.
     *
     * `manageQueue: false` because `evaluateMastery` already made that call with
     * the full picture. Left to itself, this method treats *any* improvement as
     * success and clears the row — so a skill that went 40 → 45, still WEAK and
     * correctly rescheduled for tomorrow, would be marked done and dropped. The
     * queue belongs to whoever wrote the mastery score.
     *
     * Failing here must not fail the lesson: the child finished it either way,
     * and the loop self-heals on the next roadmap read.
     */
    if (outcome.reviewPass && outcome.masteryResult) {
      try {
        const review = await reinforcementEngineService.processReinforcement(
          childId,
          lessonId,
          outcome.reviewPass.beforeScore,
          outcome.masteryResult.masteryScore,
          outcome.reviewPass.activityType,
          { manageQueue: false },
        );
        logger.info(
          {
            childId,
            lessonId,
            beforeScore: Math.round(outcome.reviewPass.beforeScore * 10) / 10,
            afterScore: Math.round(outcome.masteryResult.masteryScore * 10) / 10,
            improved: review.success,
          },
          'Review completed',
        );
      } catch (error) {
        logger.error({ childId, lessonId, error }, 'Failed to record a completed review');
      }
    }

    /*
     * ---- 8. keep the per-modality measurement ------------------------------
     *
     * `ModalityPerformance` and `LearningProfile` had no writer on any path a
     * child could reach — their only two were `POST /adaptation/:childId/analyze`
     * and `POST /adaptive/process`, and the app calls neither. So four services
     * read a profile row that did not exist, and
     * `reinforcement-engine.selectActivityType` fell through to
     * `defaultFallbackModality` every time: every review, for every child, was a
     * video.
     *
     * The measurement itself was never missing. `gatherModalitySignals` above
     * already produced real per-modality evidence in order to score the lesson —
     * genuine 0-100 scores for speak and write, completion and stars for video
     * and listen — and it was being discarded the moment the score was computed.
     *
     * After commit and swallowed on failure, for the same two reasons as step 7:
     * these repositories take no `tx`, and a telemetry write must never be able
     * to fail a lesson a child has already finished.
     */
    if (outcome.masteryResult) {
      try {
        const samples = perModalitySamples(
          outcome.signals,
          outcome.masteryResult.confidenceScore
        );
        const profile = await modalityTelemetryService.recordLessonModalities(childId, samples);
        if (profile) {
          logger.info(
            {
              childId,
              lessonId,
              modalities: samples.map((s) => s.modality),
              preferred: profile.preferred,
              // Null is a real answer, not a gap — see `modality-profile.ts`.
              weakest: profile.weakest,
              weakestWithheld: profile.weakestWithheld,
              spread: profile.spread,
            },
            'Modality profile updated',
          );
        }
      } catch (error) {
        logger.error({ childId, lessonId, error }, 'Failed to record modality performance');
      }
    }

    const evidence: LessonEvidence = outcome.evidence;
    logger.info(
      {
        childId,
        lessonId,
        accuracy: Math.round(evidence.accuracy),
        engagement: evidence.engagementScore,
        retries: evidence.retries,
        coverage: `${evidence.completedCount}/${evidence.expectedCount}`,
        masteryScore: outcome.masteryResult ? Math.round(outcome.masteryResult.masteryScore) : null,
        masteryState: outcome.masteryResult?.currentState ?? null,
        // The gate's high-water mark, which can legitimately sit above the live
        // score. Logging both is the only way to tell a decay from a bug.
        gateMastery: Math.round(outcome.gateMastery),
        gateMasteryBefore:
          outcome.previousMastery === null ? null : Math.round(outcome.previousMastery),
        proven: evidence.masteryProven,
      },
      'Lesson completed'
    );

    return {
      progress: outcome.progress,
      becameCompleted: outcome.becameCompleted,
      moduleCompleted: outcome.moduleCompleted,
      categoryCompleted: outcome.categoryCompleted,
      starsEarned: outcome.starsEarned,
      totalStars: outcome.totalStars,
      mastery: outcome.masteryResult
        ? {
            score: Math.round(outcome.masteryResult.masteryScore * 10) / 10,
            state: outcome.masteryResult.currentState,
            previousScore: outcome.masteryResult.previousMasteryScore,
            delta: Math.round(outcome.masteryResult.masteryScoreDelta * 10) / 10,
            proven: evidence.masteryProven,
            nextReviewDate: outcome.masteryResult.nextReviewDate,
            isRegression: outcome.masteryResult.isRegression,
            unlockedSkills: outcome.masteryResult.unlockedSkills,
          }
        : null,
      evidence: {
        accuracy: Math.round(evidence.accuracy),
        engagement: evidence.engagementScore,
        attempts: evidence.attempts,
        retries: evidence.retries,
        expectedActivities: evidence.expectedCount,
        completedActivities: evidence.completedCount,
        sessionsWithEvidence: evidence.sessionsWithEvidence,
        requiredSessions: evidence.requiredSessions,
      },
    };
  }
}

export const lessonCompletionService = new LessonCompletionService();
