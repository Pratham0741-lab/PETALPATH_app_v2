import { prisma } from '../../config/database.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { describeUnlockDecision, type UnlockReason } from '../curriculum/unlock-policy.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { startOfLocalDay } from '../../shared/utils/calendar-day.js';
import { reinforcementQueueRepository } from '../reinforcement/repositories/reinforcement-queue.repository.js';
import { reinforcementHistoryRepository } from '../reinforcement/repositories/reinforcement-history.repository.js';
import { planReviews } from '../roadmap/review-plan.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Refusals that are about *how well* the child did, rather than about where they
 * are in the curriculum.
 *
 * Under a soft gate these become advice: the review queue surfaces the weak
 * lesson, and the child is still allowed to carry on. Sequence refusals are
 * structural and hold in either mode — a soft gate must not turn into "any
 * lesson, any time".
 */
const SCORE_REFUSALS: ReadonlySet<UnlockReason> = new Set<UnlockReason>([
  'PREREQUISITE_BELOW_FLOOR',
  'WEIGHTED_SCORE_BELOW_THRESHOLD',
]);

export class LessonAccessService {
  async validateLessonAccess(childId: string, lessonId: string): Promise<void> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child profile not found');
    }

    const node = curriculumService.getLessonById(lessonId);
    if (!node) {
      throw new NotFoundError('Lesson not found in curriculum');
    }

    const childGradeId = curriculumService.resolveChildGrade(child);
    const lessonGradeId = curriculumService.getGradeOfLesson(lessonId);

    if (lessonGradeId !== childGradeId) {
      throw new ForbiddenError("Access denied: lesson is outside the learner's grade");
    }

    // Check unlock status
    const gradeLessons = curriculumService.getLessonsInCurriculumOrder(childGradeId);
    const progressList = await prisma.lessonProgress.findMany({
      where: { childId },
    });
    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });

    const decision = curriculumEngineService.evaluateLessonUnlock(
      lessonId,
      gradeLessons,
      progressList,
      knowledgeStates
    );

    if (!decision.unlocked) {
      /*
       * The refusal names what to do about it. "Access denied: lesson is
       * currently locked" was the only thing the API ever said, so the padlock
       * the child taps and the message the parent reads were both dead ends.
       */
      const titleOf = (id: string) => curriculumService.getLessonById(id)?.title;
      const advice = describeUnlockDecision(decision, titleOf);

      const softened = engineConfig.unified.roadmap.gateMode === 'soft'
        && SCORE_REFUSALS.has(decision.reason);

      if (softened) {
        /*
         * A thin pass must not become a wall for a four-year-old. The lesson
         * opens, and the weak prerequisite comes back as a review instead — the
         * gate advises, the queue teaches. Set `gateMode: 'hard'` to enforce.
         */
        logger.info(
          { childId, lessonId, reason: decision.reason, weightedScore: decision.weightedScore, advice },
          'Lesson opened under a soft unlock gate',
        );
        return;
      }

      throw new ForbiddenError(advice);
    }

    // Structurally allowed. The one remaining question is whether the child owes
    // a review first.
    await this.enforceReviewGate(childId, lessonId, gradeLessons, progressList);
  }

  /**
   * The enforcement half of the review gate.
   *
   * `roadmap.service.ts` decides which reviews the child meets today and, under
   * `gateMode: 'hard'`, reports the next new lesson as locked. That is a
   * projection — a padlock drawn on a screen. Without this, `POST
   * /lessons/:id/start` would still open the lesson, so the gate would be
   * decorative and any client that skipped the roadmap read would sail past it.
   *
   * Both halves route through the same `planReviews`, with the same inputs and
   * therefore the same caps, so `reviewGate.isBlocking` and this refusal cannot
   * disagree about whether today is a review day.
   *
   * Three things are always allowed through, because none of them is "moving
   * on": a lesson that *is* one of the surfaced reviews (that is the point), a
   * lesson the child has already completed (free replay was never gated), and
   * anything at all once the day's reviews are done.
   */
  private async enforceReviewGate(
    childId: string,
    lessonId: string,
    gradeLessons: readonly { id: string }[],
    progressList: readonly { lessonId: string; status: string }[],
  ): Promise<void> {
    // Soft mode short-circuits before the queries, so the shipped default costs
    // this endpoint nothing at all.
    if (engineConfig.unified.roadmap.gateMode !== 'hard') {
      return;
    }

    const completedIds = new Set(
      progressList.filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId),
    );
    if (completedIds.has(lessonId)) {
      return;
    }

    const now = new Date();
    const [dueReviews, reviewsDoneToday] = await Promise.all([
      reinforcementQueueRepository.findDueSkills(childId, now),
      reinforcementHistoryRepository.countSince(
        childId,
        startOfLocalDay(now, engineConfig.unified.review.timezoneOffsetMinutes),
      ),
    ]);
    if (dueReviews.length === 0) {
      return;
    }

    // Reviewable means: in this grade, and already finished once. Same rule the
    // projection applies, for the same reason — a queue row can name a skill the
    // child has never opened.
    const reviewableIds = new Set(
      gradeLessons.filter((lesson) => completedIds.has(lesson.id)).map((lesson) => lesson.id),
    );

    const plan = planReviews({ due: dueReviews, reviewableIds, reviewsDoneToday });
    if (!plan.blocksNextLesson) {
      return;
    }
    if (plan.surfaced.some((review) => review.skillId === lessonId)) {
      return;
    }

    /*
     * The queue row's own sentence, not a generic refusal. `describeReviewCause`
     * already wrote it for a parent to read ("Let's practice Counting to 5 again
     * — it slipped a little"), and inventing a second phrasing here is how the
     * roadmap and the API drift apart.
     */
    logger.info(
      {
        childId,
        lessonId,
        dueCount: plan.dueCount,
        surfacedCount: plan.surfaced.length,
        reviewsDoneToday,
      },
      'Lesson refused under a hard review gate',
    );

    throw new ForbiddenError(plan.surfaced[0].reason);
  }
}

export const lessonAccessService = new LessonAccessService();
