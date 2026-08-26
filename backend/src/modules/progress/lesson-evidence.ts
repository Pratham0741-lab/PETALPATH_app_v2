/**
 * Lesson evidence — what the child actually did, measured server-side.
 *
 * The adaptive engine was previously fed four constants at its only call site
 * (`responseTime: 15`, `attempts: 1`, `helpRequests: 0`, `sessionDuration: 120`)
 * plus two values derived from the same number: `accuracy = stars / 3 * 100` and
 * `engagementScore = accuracy`. Five weighted dimensions collapsed onto one
 * input, so three of the five could never move and the engine could not tell a
 * child who struggled through four activities from one who breezed through them.
 *
 * This module reconstructs the missing signals from data the app already
 * records — `SpeakProgress` / `WriteProgress` carry real 0-100 scores and
 * attempt counts, `ListenProgress` carries attempts, and the row timestamps
 * bound how long the work took. Nothing here trusts the client: the completion
 * request names a lesson, and the evidence is read from the database.
 *
 * `computeLessonEvidence` is pure and takes plain records, so it runs under the
 * DB-free tsc harness. `gatherLessonEvidence` is the thin database half.
 */

import { engineConfig } from '../../shared/config/engine.config.js';
import { ActivityType } from '../../shared/enums.js';
import { normalizeActivityType } from '../../shared/utils/activity-type-normalizer.js';
// Type-only, so it is erased at compile time and the pure half of this module
// still runs under the DB-free harness.
import type { Prisma } from '@prisma/client';

/** The four modalities `LessonProgress` actually tracks. */
export type ModalityKey = 'video' | 'listen' | 'speak' | 'write';

export const MODALITY_KEYS: readonly ModalityKey[] = ['video', 'listen', 'speak', 'write'];

/** Maximum stars any single activity can award. */
const MAX_STARS_PER_ACTIVITY = 3;

/**
 * One modality's raw record, assembled from `LessonProgress` (flags and stars)
 * and the matching per-activity table (attempts, real scores, timestamps).
 */
export interface ModalitySignal {
  readonly modality: ModalityKey;
  /** The curriculum node declares an activity of this modality. */
  readonly expected: boolean;
  /** `LessonProgress.<modality>Completed`, or the store's own `isCompleted`. */
  readonly completed: boolean;
  /** `LessonProgress.<modality>Stars`, 0-3. */
  readonly stars: number;
  /**
   * A real 0-100 score where the store keeps one (speak, write). `null` for
   * video and listen, which record participation rather than correctness —
   * treating "watched the video" as 100% accuracy is exactly the inflation this
   * module exists to remove.
   */
  readonly score: number | null;
  /** Cumulative lifetime attempts in this store, or `null` when untracked. */
  readonly cumulativeAttempts: number | null;
  /** Any evidence at all: an attempt, a score, or a completion flag. */
  readonly attempted: boolean;
  /** Store row `updatedAt`, used to bound how long the work took. */
  readonly lastActivityAt: Date | null;
}

export interface LessonEvidenceInput {
  /** Normalized modalities the curriculum node asks for. */
  readonly expectedModalities: readonly ModalityKey[];
  readonly signals: readonly ModalitySignal[];
  /**
   * Cumulative attempts already accounted for by the previous evaluation
   * (`SkillHealth.attemptCount`). Everything is windowed against this so a
   * child's confidence does not decay simply because their lifetime attempt
   * count keeps growing.
   */
  readonly priorAttemptTotal: number;
  /** How many times this skill has been evaluated before. */
  readonly priorSessions: number;
  /** `CurriculumNode.mastery.attempts`, when the node declares one. */
  readonly requiredAttempts?: number | null;
  /**
   * `CurriculumNode.difficulty`, 1-5. Decides how many separate sessions
   * MASTERED asks for; see `engineConfig.unified.evidence
   * .requiredSessionsByDifficulty`.
   */
  readonly difficulty?: number | null;
  /** Minutes the curriculum budgets for the lesson, used to bound duration. */
  readonly estimatedMinutes?: number | null;
  /** Hints or help taps reported for this window. Best-effort; defaults to 0. */
  readonly helpRequests?: number;
}

export interface LessonEvidence {
  /** 0-100. Real scores where they exist, star-derived otherwise. */
  readonly accuracy: number;
  /** 0-100, independent of accuracy: coverage, time-on-task, follow-through. */
  readonly engagementScore: number;
  /** Attempts inside this window, at least 1. */
  readonly attempts: number;
  /** Attempts beyond the first per activity — the real retry count. */
  readonly retries: number;
  readonly helpRequests: number;
  /** Mean seconds per attempt. */
  readonly responseTime: number;
  /** Seconds of work in this window. */
  readonly sessionDuration: number;
  readonly expectedCount: number;
  readonly completedCount: number;
  readonly attemptedCount: number;
  /** True when at least one modality supplied a measured score. */
  readonly hasRealScore: boolean;
  /**
   * Whether MASTERED has been earned rather than guessed at. Requires full
   * coverage of the node's activities across the number of separate practice
   * sessions the node asks for.
   */
  readonly masteryProven: boolean;
  readonly requiredSessions: number;
  readonly sessionsWithEvidence: number;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Stars are a coarse, already-banded view of a score, so invert the same bands
 * the star calculators use (`star.service.ts`: <40 / <60 / <80 / rest) and take
 * the midpoint of each band rather than `stars / 3 * 100`. The old formula
 * mapped 1 star to 33% — well below the 40-59% the star actually represents —
 * and so pushed every partially-successful child into LEARNING.
 */
export function starsToAccuracy(stars: number, completed: boolean): number {
  const s = clamp(Math.round(stars), 0, MAX_STARS_PER_ACTIVITY);
  if (s >= 3) return 90;
  if (s === 2) return 70;
  if (s === 1) return 50;
  return completed ? 30 : 0;
}

/**
 * How many separate practice sessions this node must be passed in before
 * MASTERED is believed.
 *
 * The interesting decision is which of two fields to trust. `mastery.attempts`
 * looks authoritative and is not: it reads **3 on all 1209 curriculum nodes**, as
 * does `mastery.required_score` at 80. They are authoring defaults, so treating
 * `attempts` as a per-node judgement makes every lesson identical — which is the
 * state this replaces. `difficulty` is the only field with a real spread
 * (1:100, 2:397, 3:467, 4:159, 5:86), so difficulty decides.
 *
 * `attempts` is not ignored, though. It overrides the difficulty table whenever a
 * node declares something *other* than the global default — that is precisely the
 * signal that a human authored it deliberately. The day someone writes
 * `attempts: 5` on one lesson, that lesson asks for five.
 */
export function requiredSessionsFor(
  difficulty?: number | null,
  declaredAttempts?: number | null
): number {
  const cfg = engineConfig.unified.evidence;

  const authored =
    typeof declaredAttempts === 'number' &&
    Number.isFinite(declaredAttempts) &&
    declaredAttempts > 0 &&
    declaredAttempts !== cfg.defaultRequiredAttempts
      ? Math.round(declaredAttempts)
      : null;

  const level = typeof difficulty === 'number' && Number.isFinite(difficulty)
    ? Math.round(difficulty)
    : null;
  const fromDifficulty =
    (level !== null ? cfg.requiredSessionsByDifficulty[level] : undefined) ??
    cfg.defaultRequiredAttempts;

  return Math.max(1, cfg.minSessionsForMastered, authored ?? fromDifficulty);
}

/**
 * Derives every engine input from the child's recorded work.
 */
export function computeLessonEvidence(input: LessonEvidenceInput): LessonEvidence {
  const cfg = engineConfig.unified.evidence;
  const expected = new Set(input.expectedModalities);
  const expectedCount = expected.size;

  const relevant = input.signals.filter((s) => expected.has(s.modality) || s.attempted);

  const completedSignals = relevant.filter((s) => s.completed);
  const attemptedSignals = relevant.filter((s) => s.attempted);
  const completedExpected = completedSignals.filter((s) => expected.has(s.modality)).length;
  const attemptedExpected = attemptedSignals.filter((s) => expected.has(s.modality)).length;

  // ---- accuracy -----------------------------------------------------------
  // Prefer measured scores; fall back to stars only where nothing measured the
  // child at all.
  const scored = relevant.filter((s) => s.score !== null);
  const hasRealScore = scored.length > 0;

  let accuracy: number;
  if (hasRealScore) {
    accuracy = scored.reduce((sum, s) => sum + clamp(s.score as number, 0, 100), 0) / scored.length;
  } else if (attemptedSignals.length > 0) {
    accuracy =
      attemptedSignals.reduce((sum, s) => sum + starsToAccuracy(s.stars, s.completed), 0) /
      attemptedSignals.length;
  } else {
    accuracy = 0;
  }
  accuracy = clamp(accuracy, 0, 100);

  // ---- attempts and retries ----------------------------------------------
  // `cumulativeAttempts` is lifetime, so window it against what the previous
  // evaluation already counted.
  const tracked = relevant.filter((s) => s.cumulativeAttempts !== null);
  const cumulativeTotal = tracked.reduce((sum, s) => sum + (s.cumulativeAttempts as number), 0);
  const windowAttempts = Math.max(0, cumulativeTotal - Math.max(0, input.priorAttemptTotal));

  // One attempt per tracked modality is the expected cost of doing the work;
  // anything beyond that is a genuine retry.
  const trackedAttemptedCount = tracked.filter((s) => (s.cumulativeAttempts as number) > 0).length;
  const retries = Math.max(0, windowAttempts - trackedAttemptedCount);
  const attempts = Math.max(1, windowAttempts, attemptedSignals.length);

  // ---- duration -----------------------------------------------------------
  const stamps = relevant
    .map((s) => s.lastActivityAt)
    .filter((d): d is Date => d instanceof Date)
    .map((d) => d.getTime())
    .sort((a, b) => a - b);

  const estimatedSeconds = Math.max(60, (input.estimatedMinutes ?? 5) * 60);
  const spanSeconds = stamps.length >= 2 ? (stamps[stamps.length - 1] - stamps[0]) / 1000 : 0;
  // A single activity leaves no span to measure, and a lesson picked up days
  // later leaves an absurd one, so fall back to the curriculum's own estimate
  // and cap at three times that.
  //
  // Nothing attempted means no time on task, and the estimate must NOT stand in:
  // doing so credited a child who pressed Complete immediately with the full
  // duration term of engagement (30 points for an untouched lesson).
  const sessionDuration =
    attemptedSignals.length === 0
      ? 0
      : Math.round(clamp(spanSeconds > 0 ? spanSeconds : estimatedSeconds, 15, estimatedSeconds * 3));

  const responseTime = Math.round((sessionDuration / attempts) * 10) / 10;

  // ---- engagement ---------------------------------------------------------
  // Deliberately shares no term with accuracy: a child can be fully engaged and
  // still get answers wrong, which is the most important case for the engine to
  // be able to see.
  const w = cfg.engagement.weights;
  const coverage = expectedCount > 0 ? completedExpected / expectedCount : completedSignals.length > 0 ? 1 : 0;
  const durationRatio = clamp(sessionDuration / cfg.engagement.targetSessionSeconds, 0, 1);
  // Follow-through: of the activities they started, how many did they finish?
  const persistence = attemptedExpected > 0 ? clamp(completedExpected / attemptedExpected, 0, 1) : 0;

  let engagementScore =
    100 * (w.coverage * coverage + w.duration * durationRatio + w.persistence * persistence);
  if (attemptedSignals.length > 0) {
    engagementScore = Math.max(engagementScore, cfg.engagement.minScoreWhenAttempted);
  }
  engagementScore = clamp(Math.round(engagementScore), 0, 100);

  // ---- evidence sufficiency ----------------------------------------------
  const requiredSessions = requiredSessionsFor(input.difficulty, input.requiredAttempts);
  const sessionsWithEvidence = Math.max(1, input.priorSessions + 1);
  const fullCoverage = expectedCount === 0 ? completedSignals.length > 0 : completedExpected >= expectedCount;
  const masteryProven = fullCoverage && sessionsWithEvidence >= requiredSessions;

  return {
    accuracy,
    engagementScore,
    attempts,
    retries,
    helpRequests: Math.max(0, Math.round(input.helpRequests ?? 0)),
    responseTime,
    sessionDuration,
    expectedCount,
    completedCount: completedExpected,
    attemptedCount: attemptedExpected,
    hasRealScore,
    masteryProven,
    requiredSessions,
    sessionsWithEvidence,
  };
}

/**
 * The lesson's four modalities in the vocabulary `ModalityPerformance` and
 * `ReinforcementHistory` record.
 *
 * `listen` maps to LISTENING rather than STORY: the child listened to audio, and
 * mislabelling it would send `selectActivityType` rotating away from the wrong
 * thing.
 */
export const ACTIVITY_TYPE_OF: Readonly<Record<ModalityKey, ActivityType>> = {
  video: ActivityType.VIDEO,
  listen: ActivityType.LISTENING,
  speak: ActivityType.SPEAKING,
  write: ActivityType.WRITING,
};

/** One modality's contribution to the child's long-run modality profile. */
export interface ModalitySample {
  readonly activityType: ActivityType;
  readonly modality: ModalityKey;
  readonly accuracy: number;
  readonly engagement: number;
  readonly confidence: number;
  readonly at: Date | null;
}

/**
 * Splits one lesson's work into per-modality observations, so
 * `ModalityPerformance` finally has a writer on the learner path.
 *
 * ## What is genuinely per-modality here, and what is not
 *
 * Being straight about this matters, because the whole point of the table is to
 * distinguish four things from each other:
 *
 * - **accuracy — genuinely per-modality.** `SpeakProgress` and `WriteProgress`
 *   keep real 0-100 scores; video and listen record participation, so their
 *   accuracy is inverted from stars by `starsToAccuracy`, the same bands the star
 *   calculators use.
 * - **engagement — per-modality but coarse.** The only per-modality
 *   participation fact the stores keep is whether the child finished the activity,
 *   so this is "completed, or merely started". Time on task is a single span
 *   across the whole lesson and cannot be divided between four activities without
 *   inventing numbers, and inventing numbers here is exactly what put a
 *   fabricated `averageEngagement = 60` into this table in the first place
 *   (`adaptation.service.ts`).
 * - **confidence — session-level, applied to each modality.** It is a real
 *   measured value from the engine, but it describes the whole pass. It carries
 *   the smallest weight (0.2) in `modalityScore`, which is the right place for the
 *   least specific of the three.
 *
 * Only attempted modalities are returned. A modality the child never touched is
 * unmeasured, and writing a zero for it would be indistinguishable from a
 * modality they tried and failed.
 */
export function perModalitySamples(
  signals: readonly ModalitySignal[],
  sessionConfidence: number
): ModalitySample[] {
  const minEngagement = engineConfig.unified.evidence.engagement.minScoreWhenAttempted;
  const confidence = clamp(sessionConfidence, 0, 100);

  return signals
    .filter((signal) => signal.attempted)
    .map((signal) => ({
      activityType: ACTIVITY_TYPE_OF[signal.modality],
      modality: signal.modality,
      accuracy:
        signal.score !== null
          ? clamp(signal.score, 0, 100)
          : starsToAccuracy(signal.stars, signal.completed),
      engagement: signal.completed ? 100 : minEngagement,
      confidence,
      at: signal.lastActivityAt,
    }));
}

/**
 * Which of the four tracked modalities a curriculum node asks for.
 *
 * Mirrors `canCompleteLesson`'s normalization so the completion gate and the
 * evidence gatherer cannot disagree about what the lesson contains. Note that
 * `normalizeActivityType` can also return `drag_drop`, which no progress table
 * records — those activities are intentionally not treated as expected, because
 * a requirement nothing can ever satisfy would leave the lesson permanently
 * incomplete.
 */
export function expectedModalitiesOf(
  activities: readonly { readonly type: string }[]
): ModalityKey[] {
  const found = new Set<ModalityKey>();
  for (const activity of activities) {
    const normalized = normalizeActivityType(activity.type);
    if (normalized === 'video' || normalized === 'listen' || normalized === 'speak' || normalized === 'write') {
      found.add(normalized);
    }
  }
  return MODALITY_KEYS.filter((k) => found.has(k));
}

interface LessonProgressLike {
  readonly videoCompleted: boolean;
  readonly listenCompleted: boolean;
  readonly speakCompleted: boolean;
  readonly writeCompleted: boolean;
  readonly videoStars: number;
  readonly listenStars: number;
  readonly speakStars: number;
  readonly writeStars: number;
}

/**
 * Reads the per-modality stores for one lesson and assembles the signals.
 *
 * A single query with nested includes: `Activity` rows for the lesson, each
 * with this child's listen/speak/write progress, plus the video's progress via
 * `Activity.video.progressions` (`VideoProgress` is keyed by `videoId`, not
 * `activityId`, so it can only be reached through the video).
 */
export async function gatherModalitySignals(
  childId: string,
  lessonId: string,
  expectedModalities: readonly ModalityKey[],
  lessonProgress: LessonProgressLike | null,
  client: Prisma.TransactionClient
): Promise<ModalitySignal[]> {
  const activities = await client.activity.findMany({
    where: { lessonId, deletedAt: null },
    include: {
      video: { include: { progressions: { where: { childId } } } },
      listenProgress: { where: { childId } },
      speakProgress: { where: { childId } },
      writeProgress: { where: { childId } },
    },
  });

  interface Accumulator {
    completed: boolean;
    score: number | null;
    scoreCount: number;
    attempts: number | null;
    attempted: boolean;
    lastActivityAt: Date | null;
  }

  const acc = new Map<ModalityKey, Accumulator>();
  for (const key of MODALITY_KEYS) {
    acc.set(key, { completed: false, score: null, scoreCount: 0, attempts: null, attempted: false, lastActivityAt: null });
  }

  const touch = (key: ModalityKey, at: Date | null | undefined) => {
    const entry = acc.get(key)!;
    entry.attempted = true;
    if (at instanceof Date && (entry.lastActivityAt === null || at > entry.lastActivityAt)) {
      entry.lastActivityAt = at;
    }
  };

  const addScore = (key: ModalityKey, score: number) => {
    const entry = acc.get(key)!;
    entry.score = (entry.score ?? 0) + score;
    entry.scoreCount += 1;
  };

  const addAttempts = (key: ModalityKey, count: number) => {
    const entry = acc.get(key)!;
    entry.attempts = (entry.attempts ?? 0) + Math.max(0, count);
  };

  for (const activity of activities) {
    const videoRows: any[] = activity.video?.progressions ?? [];
    for (const row of videoRows) {
      touch('video', row.updatedAt ?? row.lastWatchedAt);
      if (row.isCompleted) acc.get('video')!.completed = true;
    }

    for (const row of (activity.listenProgress ?? []) as any[]) {
      touch('listen', row.updatedAt);
      addAttempts('listen', row.attemptCount ?? 0);
      if (row.isCompleted) acc.get('listen')!.completed = true;
    }

    for (const row of (activity.speakProgress ?? []) as any[]) {
      touch('speak', row.updatedAt);
      addAttempts('speak', row.attemptCount ?? 0);
      addScore('speak', row.bestScore ?? 0);
      if (row.isCompleted) acc.get('speak')!.completed = true;
    }

    for (const row of (activity.writeProgress ?? []) as any[]) {
      touch('write', row.updatedAt);
      addAttempts('write', row.attemptCount ?? 0);
      addScore('write', row.bestScore ?? 0);
      if (row.isCompleted) acc.get('write')!.completed = true;
    }
  }

  const expected = new Set(expectedModalities);
  const starsOf: Record<ModalityKey, number> = {
    video: lessonProgress?.videoStars ?? 0,
    listen: lessonProgress?.listenStars ?? 0,
    speak: lessonProgress?.speakStars ?? 0,
    write: lessonProgress?.writeStars ?? 0,
  };
  const flagOf: Record<ModalityKey, boolean> = {
    video: lessonProgress?.videoCompleted ?? false,
    listen: lessonProgress?.listenCompleted ?? false,
    speak: lessonProgress?.speakCompleted ?? false,
    write: lessonProgress?.writeCompleted ?? false,
  };

  return MODALITY_KEYS.map((modality) => {
    const entry = acc.get(modality)!;
    const stars = starsOf[modality];
    const completed = entry.completed || flagOf[modality];
    return {
      modality,
      expected: expected.has(modality),
      completed,
      stars,
      score: entry.scoreCount > 0 ? (entry.score as number) / entry.scoreCount : null,
      cumulativeAttempts: entry.attempts,
      attempted: entry.attempted || completed || stars > 0,
      lastActivityAt: entry.lastActivityAt,
    };
  });
}
