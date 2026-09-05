import { prisma } from '../../config/database.js';
import { storageService } from '../../shared/services/storage.service.js';
import { NotFoundError } from '../../utils/errors.js';
import { curriculumService, curriculumEngineService, curriculumLoader } from '../curriculum/index.js';
import { CurriculumNode } from '../curriculum/curriculum.types.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { startOfLocalDay } from '../../shared/utils/calendar-day.js';
import { reinforcementQueueRepository } from '../reinforcement/repositories/reinforcement-queue.repository.js';
import { reinforcementHistoryRepository } from '../reinforcement/repositories/reinforcement-history.repository.js';
import { modalityTelemetryService } from '../adaptive/modality-telemetry.service.js';
import { planReviews, describePracticeSession } from './review-plan.js';

const formatRoadmapActivity = (activity: any) => {
  return {
    ...activity,
    video: activity.video
      ? {
          ...activity.video,
          videoUrl: storageService.getVideoUrl(activity.video.videoKey),
          thumbnailUrl: storageService.getPublicUrl(activity.video.thumbnailKey || null),
          filename: activity.video.videoKey,
        }
      : null,
    audio: activity.audio
      ? {
          ...activity.audio,
          audioUrl: storageService.getAudioUrl(activity.audio.audioKey),
          filename: activity.audio.audioKey,
        }
      : null,
  };
};

function themeIdOfNode(node: CurriculumNode, cur: any): string {
  for (const theme of cur.themes) {
    if (theme.nodes.some((n: any) => n.id === node.id)) {
      return theme.id;
    }
  }
  return '';
}

export class RoadmapService {
  async getRoadmap(childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        lessonProgress: true,
      },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
    if (!gradeCurriculum) {
      throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
    }

    const nodes = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const nodeIds = nodes.map((n) => n.id);

    // Query child progress & knowledge states
    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: nodeIds } },
    });
    const progressMap = new Map<string, any>(progressList.map((p) => [p.lessonId, p]));

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });
    const knowledgeMap = new Map<string, any>(knowledgeStates.map((k) => [k.topicId, k]));

    // Query seeded activities from the database to map audio/video relation paths
    const allActivities = await prisma.activity.findMany({
      where: { lessonId: { in: nodeIds }, deletedAt: null },
      include: { video: true, audio: true },
    });
    const activitiesMap = new Map<string, any[]>();
    allActivities.forEach((act) => {
      const list = activitiesMap.get(act.lessonId) || [];
      list.push(formatRoadmapActivity(act));
      activitiesMap.set(act.lessonId, list);
    });

    // Build Node Status List
    const enrichedNodes: any[] = [];
    let completedCount = 0;

    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const progress = progressMap.get(node.id);
      const isCompleted = progress?.status === 'COMPLETED';

      if (isCompleted) {
        completedCount++;
      }

      // Unlock evaluation resolved via stateless CurriculumEngineService
      const isUnlocked = curriculumEngineService.isLessonUnlocked(
        node.id,
        nodes,
        progressList,
        knowledgeStates
      );

      enrichedNodes.push({
        id: node.id,
        title: node.title,
        themeId: themeIdOfNode(node, gradeCurriculum),
        /*
         * The curriculum carries a 1-5 difficulty on every node and this
         * projection was dropping it, so the app received a lesson with no
         * difficulty at all. Its Lesson type declared the field as required, so
         * nothing complained: the Lesson Overview rendered the string
         * "Level undefined" (clipped on screen to "Level un…") and the Journey
         * roadmap's difficulty colour fell through to its green default for
         * every lesson regardless of how hard it was.
         */
        difficulty: node.difficulty,
        isCompleted,
        isUnlocked,
        stars: progress?.totalStars ?? 0,
        xp: progress?.status === 'COMPLETED' ? (node.reward?.xp ?? 0) : 0,
        coins: progress?.status === 'COMPLETED' ? (node.reward?.coins ?? 0) : 0,
        attempts: knowledgeMap.get(node.id)?.totalAttempts ?? 0,
        mastery: knowledgeMap.get(node.id)?.mastery ?? 0.0,
        completedAt: progress?.completedAt ?? null,
        prerequisite: node.prerequisites[0] || null,
        activities: activitiesMap.get(node.id) || [],
        progress: progress || null,
      });
    }

    /*
     * ---- reviews ---------------------------------------------------------
     *
     * This is the point at which the adaptive engine and the roadmap finally
     * read from each other. Everything above is the curriculum in display
     * order; the engine has been recording *what needs practicing* in
     * `ReinforcementQueue` for a while, and this projection had zero references
     * to it — no SkillHealth, no ReinforcementQueue, no nextReviewDate. The
     * queue filled up and the child never saw a single row of it.
     *
     * Two reads, in parallel, and neither is a write: there is no scheduler in
     * this backend, so "reviews appear automatically the next day" has to be
     * lazy-on-read, and a GET must stay a GET. `findDueSkills` already filters
     * `nextReviewDate <= now` and orders by the engine's priority, so what
     * arrives here is a ranked backlog; `planReviews` only decides how much of
     * it the child meets today.
     *
     * The third read is the child's modality profile — one query for the whole
     * roadmap, not one per review — so each surfaced review can say *how* to
     * practice, not just what.
     */
    const now = new Date();
    const [dueReviews, reviewsDoneToday, modalityProfile] = await Promise.all([
      reinforcementQueueRepository.findDueSkills(childId, now),
      reinforcementHistoryRepository.countSince(
        childId,
        startOfLocalDay(now, engineConfig.unified.review.timezoneOffsetMinutes),
      ),
      modalityTelemetryService.getProfile(childId),
    ]);

    /*
     * A queue row is only ever a skill id. Placement writes rows for skills the
     * child has never opened, ids can outlive a grade promotion, and a skill can
     * be queued for a lesson outside this curriculum entirely — so a review is
     * only offerable if it maps to a lesson in *this* projection that the child
     * has actually finished. Anything else is counted (`unreachableCount`) and
     * not shown.
     */
    const nodeById = new Map<string, any>(enrichedNodes.map((n) => [n.id, n]));
    const reviewableIds = new Set(
      enrichedNodes.filter((n) => n.isCompleted).map((n) => n.id as string),
    );

    const plan = planReviews({ due: dueReviews, reviewableIds, reviewsDoneToday });

    // Always present, so a consumer can test the flag rather than its existence.
    for (const node of enrichedNodes) {
      node.isReview = false;
    }

    const reviews = plan.surfaced.flatMap((item) => {
      const node = nodeById.get(item.skillId);
      if (!node) return [];

      /*
       * Annotated in place rather than appended as extra entries. `nodes[]` is
       * keyed by lesson id downstream — the app filters it by `themeId`, counts
       * `isCompleted` against `length` for each theme's progress, and uses the
       * id as a list key — so a second entry for an already-listed lesson would
       * draw that lesson twice on the path and quietly inflate "N of M lessons
       * complete". A review is not a new lesson; it is the same lesson, wanted
       * again.
       */
      node.isReview = true;
      node.reviewReason = item.reason;
      node.reviewPriority = item.priority;
      node.reviewDueAt = new Date(item.nextReviewDate).toISOString();

      return [{
        lessonId: node.id,
        title: node.title,
        themeId: node.themeId,
        difficulty: node.difficulty,
        stars: node.stars,
        // Already a sentence a parent can read — see `describeReviewCause`.
        reason: item.reason,
        priority: item.priority,
        dueAt: node.reviewDueAt,
        masteryState: item.masteryState ?? null,
        /*
         * How to practice it: the way of working this child finds hardest.
         *
         * Null far more often than not, and that is deliberate — a modality with
         * one observation, or four modalities within five points of each other,
         * name no weakest. A UI must treat null as "no suggestion" rather than
         * printing a default, because a confidently-stated default is exactly the
         * fake personalisation this replaces.
         *
         * Advisory only. `reinforcement-engine.selectActivityType` makes the
         * binding choice at review time, where it can also see what was used for
         * this skill last time — a per-skill history read this GET will not do
         * once per review.
         */
        recommendedModality: modalityProfile?.weakest ?? null,
      }];
    });

    // Compute Current Node
    let nextLesson: any = null;
    for (const node of enrichedNodes) {
      if (node.isUnlocked && !node.isCompleted) {
        nextLesson = node;
        break;
      }
    }

    /*
     * Fallback when no unlocked-and-incomplete lesson was found. There are two
     * very different reasons that can happen, and they must NOT resolve the same
     * way:
     *
     *   1. The grade is genuinely finished — every node is completed. Then the
     *      last node is the right "current" (the end state).
     *   2. Nothing is *unlocked* yet — a brand-new child, or a glitch in unlock
     *      generation. Here jumping to the last node would drop the child at the
     *      FINAL lesson with every earlier module collapsed and no way back
     *      (Home only expands the current node's theme). The correct landing is
     *      the FIRST incomplete lesson — the start of the journey.
     *
     * The old code always returned the last node, which is the reported bug.
     */
    if (!nextLesson && enrichedNodes.length > 0) {
      const allCompleted = enrichedNodes.every((n: any) => n.isCompleted);
      nextLesson = allCompleted
        ? enrichedNodes[enrichedNodes.length - 1]
        : enrichedNodes.find((n: any) => !n.isCompleted) ?? enrichedNodes[0];
    }

    /*
     * The gate. Under `gateMode: 'soft'` — the shipped default — this whole
     * block is inert: reviews are surfaced ahead of the next lesson and the
     * child may still go straight on. Under 'hard' the review becomes the
     * current node and the next new lesson reports locked, with the queue's own
     * sentence as the reason so the padlock explains itself.
     *
     * Soft first on purpose: a hard gate plus any scoring defect equals a
     * five-year-old who cannot play. The enforcement half lives in
     * `lessons/lesson-access.service.ts`, so flipping the mode changes both the
     * projection and the API together.
     */
    if (plan.blocksNextLesson && reviews.length > 0 && nextLesson && !nextLesson.isCompleted) {
      nextLesson.isUnlocked = false;
      nextLesson.lockedReason = reviews[0].reason;
    }

    const currentNode =
      plan.blocksNextLesson && reviews.length > 0
        ? nodeById.get(reviews[0].lessonId)
        : nextLesson;

    /*
     * ---- the practice session --------------------------------------------
     *
     * The same reviews, described as one stop the app can draw in front of the
     * day's new lesson. Purely a projection of what is already computed above —
     * it reads `reviews`, `reviewsDoneToday` and `nextLesson` and writes nothing,
     * so it cannot change which lessons are unlocked or which one is current.
     *
     * Deliberately *not* folded into `currentNode`. That value is what
     * `ContinueLearningCard` opens and what `handleResume` feeds to
     * `selectLesson` and then `navigateToActivity`, all of which need a real
     * lesson with `activities` and `progress`. A practice session has neither, so
     * making it the current node would put a dead end behind the app's biggest
     * button. Under a hard gate `currentNode` stays the first review's own lesson.
     *
     * `reviews` is passed rather than `plan.surfaced` because it has already been
     * narrowed to skills that map to a lesson in this projection — the stop must
     * describe what the child can actually open.
     */
    const practiceSession = describePracticeSession({
      surfaced: reviews,
      reviewsDoneToday,
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            themeId: nextLesson.themeId,
            isCompleted: nextLesson.isCompleted,
          }
        : null,
      isBlocking: plan.blocksNextLesson,
      now,
    });

    const totalCount = enrichedNodes.length;
    const completion = totalCount > 0 ? parseFloat(((completedCount / totalCount) * 100).toFixed(1)) : 0.0;

    // Build visual roadmap Categories structure for backwards compatibility
    const themesList = gradeCurriculum.themes.map((theme) => {
      const themeNodes = enrichedNodes.filter((n) => n.themeId === theme.id);
      const themeLessonsCount = themeNodes.length;
      const themeLessonsCompleted = themeNodes.filter((n) => n.isCompleted).length;

      return {
        id: theme.id,
        title: theme.title,
        description: `Theme: ${theme.title}`,
        displayOrder: theme.order,
        modules: [
          {
            id: `mod_${theme.id}`,
            categoryId: theme.id,
            title: theme.title,
            description: `Theme ${theme.title} Module`,
            displayOrder: theme.order,
            lessons: themeNodes,
            isCompleted: themeNodes.every((n) => n.isCompleted),
            isUnlocked: themeNodes.some((n) => n.isUnlocked),
          },
        ],
        lessonsCount: themeLessonsCount,
        lessonsCompleted: themeLessonsCompleted,
        stars: themeNodes.reduce((acc, curr) => acc + curr.stars, 0),
        isCompleted: themeNodes.every((n) => n.isCompleted),
        isUnlocked: themeNodes.some((n) => n.isUnlocked),
      };
    });

    const nextGradeMap: Record<string, string | null> = {
      prenursery: 'nursery',
      nursery: 'lkg',
      lkg: 'ukg',
      ukg: null,
    };

    return {
      grade: gradeCurriculum.grade.name,
      themes: gradeCurriculum.themes,
      nodes: enrichedNodes,
      currentNode,
      /**
       * What to practice before moving on, highest priority first. Each entry
       * points at a lesson already present in `nodes[]` (also flagged there with
       * `isReview`), so this is an ordering, not a second copy of the content.
       */
      reviews,
      /**
       * Why that list is the length it is. Surfaced without the counts, a child
       * with twelve weak skills and a child with two would look identical, and
       * `maxReviewsPerDay` would read as "the engine found nothing else".
       */
      reviewGate: {
        mode: engineConfig.unified.roadmap.gateMode,
        isBlocking: plan.blocksNextLesson,
        dueCount: plan.dueCount,
        surfacedCount: reviews.length,
        deferredCount: plan.deferredCount,
        unreachableCount: plan.unreachableCount,
        reviewsDoneToday,
        dailyAllowance: plan.dailyAllowance,
        nextLessonId: nextLesson?.id ?? null,
      },
      /**
       * The day's reviews as one stop for the path, to be drawn immediately
       * before `beforeLessonId`. Null when there is nothing to practice and
       * nothing was practiced today.
       *
       * A description, not a lesson: it is not in `nodes[]`, it is never
       * `currentNode`, and every count in this payload ignores it. `lessonIds`
       * points at the same lessons `reviews` does — this is a second *framing* of
       * that list, not a second copy of it.
       */
      practiceSession,
      /**
       * How this child works, when there is enough evidence to say. `null` until
       * `ModalityPerformance` has rows — which, before Stage 6, it never did on
       * any path the app could reach.
       *
       * `weakest` may be null even when `preferred` is not: naming a weakest
       * needs two evidenced modalities separated by a real margin.
       */
      modalityProfile: modalityProfile
        ? {
            preferred: modalityProfile.preferred,
            weakest: modalityProfile.weakest,
            spread: modalityProfile.spread,
            evidencedCount: modalityProfile.evidencedCount,
          }
        : null,
      progress: {
        completedCount,
        totalCount,
      },
      completion,
      nextGrade: nextGradeMap[gradeId] || null,
      // Backwards compatibility keys
      roadmap: themesList,
      currentLesson: currentNode,
    };
  }

  async getCurrentLesson(childId: string) {
    const roadmap = await this.getRoadmap(childId);
    return roadmap.currentNode;
  }

  async getCurrentTheme(childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
    if (!gradeCurriculum) {
      throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
    }

    const currentLesson = await this.getCurrentLesson(childId);
    if (!currentLesson) return null;

    const theme = gradeCurriculum.themes.find((t) =>
      t.nodes.some((n) => n.id === currentLesson.id)
    );

    return theme || null;
  }

  async getCurrentGrade(childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const metadata = curriculumLoader.getGradeMetadata(gradeId);
    if (!metadata) {
      throw new NotFoundError(`Metadata not found for grade: ${gradeId}`);
    }

    return metadata;
  }
}

export const roadmapService = new RoadmapService();
