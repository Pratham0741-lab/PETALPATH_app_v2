/**
 * Which due reviews the roadmap shows today, and in what order.
 *
 * Why this is a separate, pure module
 * -----------------------------------
 * The engine already decides *that* a skill needs review (it writes
 * `ReinforcementQueue` with a priority, a reason and a date). Nothing decided
 * *whether the child ever sees it*: `GET /roadmap` — the only roadmap endpoint
 * the app calls — had zero references to SkillHealth, ReinforcementQueue or
 * nextReviewDate. The queue filled up and was read by nobody. `GET
 * /adaptive-roadmap` did compute a REVIEW section, but nothing consumed it, it
 * scored priority on a *third* scale (200 for WEAK, on top of the engine's
 * 0–120), and it iterated `ChildSkillCurriculum`, which is empty for any child
 * who has not mastered anything. So it could not be the answer either.
 *
 * This module is the missing decision, and it is deliberately pure — no
 * repositories, no transactions — so `scripts/engine-harness/run.sh` can execute
 * it with no database. The queue's own `priority` is used as-is: it comes from
 * `review-cadence.ts::reviewPriority`, which every writer now shares, so the
 * roadmap does not get to re-rank what the engine already ranked.
 *
 * Three rules the caps encode
 * ---------------------------
 * 1. **Only what the child can actually do.** A queue row is just a skill id.
 *    Placement writes rows for skills the child has never seen (it writes a
 *    dated `SkillHealth` for every LOCKED skill in the system), and a row can
 *    outlive a grade promotion. Offering a review of a lesson that was never
 *    opened is worse than offering nothing, so `reviewableIds` is the caller's
 *    list of lessons that are genuinely revisitable — completed, and in this
 *    child's grade.
 * 2. **A bad week must not become a wall.** `maxReviewsPerDay` counts against
 *    reviews already *done* today, so the ceiling is on the day, not on the
 *    request; `maxReviewsAhead` limits how many sit in front of the next new
 *    lesson at any one moment. A child who has fallen behind on twelve skills
 *    sees two, not twelve.
 * 3. **Nothing repeats within a day.** That falls out of calendar-day
 *    scheduling rather than extra bookkeeping: practicing a skill sets its next
 *    review to the *start of a later local day*, so it cannot be due again in
 *    the session that just finished it.
 */

import { engineConfig } from '../../shared/config/engine.config.js';
import { localDayIndex, startOfLocalDay, MS_PER_DAY } from '../../shared/utils/calendar-day.js';

/**
 * The part of a `ReinforcementQueue` row this module needs. Structural, so a
 * real Prisma row satisfies it without mapping.
 */
export interface DueReview {
  readonly skillId: string;
  /** From `reviewPriority` — the engine's 0–120 scale, shared by every writer. */
  readonly priority: number;
  /** Already a sentence a parent can read; see `describeReviewCause`. */
  readonly reason: string;
  readonly nextReviewDate: Date | string;
  readonly masteryState?: string | null;
}

export interface ReviewPlanInput {
  /** Rows returned by `findDueSkills` — already filtered to `nextReviewDate <= now`. */
  readonly due: readonly DueReview[];
  /** Ids the roadmap can offer today: completed lessons in this child's grade. */
  readonly reviewableIds: ReadonlySet<string>;
  /** Reviews the child has already finished today, from `ReinforcementHistory`. */
  readonly reviewsDoneToday: number;
}

export interface ReviewPlan {
  /** Shown now, highest priority first. Never longer than the caps allow. */
  readonly surfaced: readonly DueReview[];
  /** Due *and* reviewable — the honest size of the backlog. */
  readonly dueCount: number;
  /** Reviewable but held back by a cap. Waiting, not lost. */
  readonly deferredCount: number;
  /**
   * Due but not offerable from this roadmap — a locked or never-opened skill, or
   * one from another grade. Non-zero here is a signal about the *queue*, not
   * about the child, which is why it is reported rather than silently dropped.
   */
  readonly unreachableCount: number;
  /** Reviews still allowed today after subtracting what is already done. */
  readonly dailyAllowance: number;
  /** True only under `gateMode: 'hard'` with something to review. */
  readonly blocksNextLesson: boolean;
}

function dueTime(review: DueReview): number {
  const value = new Date(review.nextReviewDate).getTime();
  return Number.isFinite(value) ? value : 0;
}

/**
 * Highest priority first; then whatever has been waiting longest; then by id.
 *
 * The last tie-break is not decoration. Without it, two equally urgent skills
 * could swap places between two reads of the same unchanged data, and the child
 * would watch the roadmap reshuffle itself on every pull-to-refresh.
 */
function byUrgency(a: DueReview, b: DueReview): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  const gap = dueTime(a) - dueTime(b);
  if (gap !== 0) return gap;
  return a.skillId < b.skillId ? -1 : a.skillId > b.skillId ? 1 : 0;
}

export function planReviews(input: ReviewPlanInput): ReviewPlan {
  const roadmap = engineConfig.unified.roadmap;

  const reviewable: DueReview[] = [];
  let unreachableCount = 0;

  for (const review of input.due) {
    if (input.reviewableIds.has(review.skillId)) {
      reviewable.push(review);
    } else {
      unreachableCount++;
    }
  }

  reviewable.sort(byUrgency);

  const dailyAllowance = Math.max(0, roadmap.maxReviewsPerDay - Math.max(0, input.reviewsDoneToday));
  const take = Math.min(dailyAllowance, roadmap.maxReviewsAhead, reviewable.length);
  const surfaced = reviewable.slice(0, take);

  return {
    surfaced,
    dueCount: reviewable.length,
    deferredCount: reviewable.length - surfaced.length,
    unreachableCount,
    dailyAllowance,
    blocksNextLesson: roadmap.gateMode === 'hard' && surfaced.length > 0,
  };
}

/* ===========================================================================
 * The practice session — the day's reviews as one stop on the path
 * ===========================================================================
 *
 * `planReviews` decides *which* skills come back today. This decides how the
 * roadmap *announces* them: as a single stop sitting in front of the day's new
 * lesson, rather than as purple recolouring of lessons the child finished weeks
 * ago and has to scroll back up the path to find.
 *
 * Why a descriptor and not a node
 * -------------------------------
 * The tempting version of this feature inserts an extra entry into `nodes[]`.
 * That array is the curriculum, and eleven separate places count it: each
 * theme's `lessonsCount`, `lessonsCompleted`, `every(isCompleted)` and
 * `some(isUnlocked)`; `progress.totalCount`; `completion`; and on the app side
 * the journey progress bar, the "today is finished" test, the theme subtitle,
 * the lesson numbering and an auto-scroll guard. A synthetic entry would make a
 * theme unable to read complete, renumber the day's lesson, and — worst — *drop*
 * the journey's completion percentage the moment a skill went stale, so the app
 * would visibly punish a child for needing practice.
 *
 * So the server sends a description of a stop and the app assembles it at render
 * time. `nodes[]` stays pure curriculum, and every count above keeps meaning
 * what it says.
 *
 * Why it can be completed and still present
 * -----------------------------------------
 * A stop that vanishes the instant it is finished reads as a bug, and denies the
 * child the one thing that makes revision bearable — the tick. When today's
 * reviews are all done the descriptor is still emitted, with an empty
 * `lessonIds` and `isCompleted: true`, and it stays for the rest of the local
 * day. A child who is genuinely up to date gets `null`: no stop, and no empty
 * shelf where a stop used to be.
 */

/** One surfaced review, as the stop needs to describe it. */
export interface PracticeItem {
  readonly lessonId: string;
  readonly title: string;
}

export interface PracticeSessionInput {
  /** `planReviews().surfaced`, resolved to lessons, in the engine's order. */
  readonly surfaced: readonly PracticeItem[];
  /** From `ReinforcementHistory` since the start of the local day. */
  readonly reviewsDoneToday: number;
  /**
   * The lesson the stop is placed in front of. `isCompleted` is carried because
   * the roadmap falls back to the *last* node once a grade is finished, and a
   * stop must not claim to come before a lesson that is already done.
   */
  readonly nextLesson: {
    readonly id: string;
    readonly themeId: string;
    readonly isCompleted: boolean;
  } | null;
  /** `planReviews().blocksNextLesson` — only ever true under a hard gate. */
  readonly isBlocking: boolean;
  readonly now: Date;
}

export interface PracticeSession {
  /**
   * Stable for the whole local day and different across the boundary, so the
   * app can use it as a list key without the stop remounting on every refresh,
   * and so two reads in one day agree.
   */
  readonly id: string;
  readonly title: string;
  /** One short line. The app renders it at a single line — see the limit below. */
  readonly subtitle: string;
  /** The theme to draw the stop in. Home only renders the expanded theme. */
  readonly themeId: string;
  /** Splice point. Null when there is no new lesson left to come before. */
  readonly beforeLessonId: string | null;
  /** The lessons this session practices, highest priority first. */
  readonly lessonIds: readonly string[];
  readonly count: number;
  /** An estimate, from config. Zero once the session is done. */
  readonly estimatedMinutes: number;
  readonly isBlocking: boolean;
  readonly isCompleted: boolean;
  /** Start of the local day this session belongs to, as an instant. */
  readonly scheduledFor: string;
}

/**
 * Longest lesson title the subtitle will quote verbatim.
 *
 * The stop's subtitle is one line on a card, so a long title would clip
 * mid-word. Past that length the count phrasing is used instead — less specific,
 * but it always reads as a finished sentence.
 */
const PRACTICE_TITLE_QUOTE_LIMIT = 28;

/** Plural-aware count, so no stop ever reads "1 skills". */
function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function describePracticeSession(input: PracticeSessionInput): PracticeSession | null {
  const roadmap = engineConfig.unified.roadmap;
  const offsetMinutes = engineConfig.unified.review.timezoneOffsetMinutes;

  const done = Math.max(0, input.reviewsDoneToday);
  const count = input.surfaced.length;

  // Up to date: nothing due, nothing practiced. No stop at all.
  if (count === 0 && done === 0) {
    return null;
  }

  const isCompleted = count === 0;

  /*
   * The id carries the *local* calendar date, which is not the UTC date of the
   * local midnight instant: at +05:30, local midnight on the 24th is 18:30Z on
   * the 23rd, so formatting `startOfLocalDay` directly would label the stop with
   * yesterday. Multiplying the day index back out gives the right label.
   */
  const dayLabel = new Date(localDayIndex(input.now, offsetMinutes) * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);

  const only = count === 1 ? input.surfaced[0].title : null;

  return {
    id: `practice-${dayLabel}`,
    title: 'Practice session',
    subtitle: isCompleted
      ? plural(done, 'skill practiced today', 'skills practiced today')
      : only && only.length <= PRACTICE_TITLE_QUOTE_LIMIT
        ? only
        : plural(count, 'skill to practice', 'skills to practice'),
    themeId: input.nextLesson?.themeId ?? '',
    beforeLessonId:
      input.nextLesson && !input.nextLesson.isCompleted ? input.nextLesson.id : null,
    lessonIds: input.surfaced.map((item) => item.lessonId),
    count,
    estimatedMinutes: count * roadmap.practiceMinutesPerSkill,
    /*
     * A finished session blocks nothing, whatever the gate says: the child has
     * already done what was asked. Without this the hard gate would keep the
     * next lesson shut for the rest of the day.
     */
    isBlocking: input.isBlocking && !isCompleted,
    isCompleted,
    scheduledFor: startOfLocalDay(input.now, offsetMinutes).toISOString(),
  };
}
