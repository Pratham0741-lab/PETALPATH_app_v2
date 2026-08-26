/**
 * Recommendation Repository
 *
 * Read-only data access for the deterministic recommendation engine.
 *
 * Every method is a single-purpose query against an existing engine-owned
 * table. No writes occur here (the engine is strictly read-only per the
 * phase spec). Where possible the queries reuse the same columns the
 * existing engines already track, so no new tables or migrations are needed.
 *
 * The higher-level priority algorithm lives in LearnerFacadeService
 * (getNextRecommendation), which composes these reads with the existing
 * RoadmapService and LearnerStateBuilder outputs.
 */

import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';

export interface IncompleteLessonResult {
  lessonId: string;
  title: string;
}

export interface FailedAssessmentResult {
  assessmentId: string;
  title: string;
  percentage: number | null;
}

export interface WeakSkillResult {
  skillId: string;
  name: string;
  masteryScore: number;
}

export interface StickerRewardResult {
  stickerId: string;
  name: string;
  requiredStars: number;
  currentStars: number;
}

export interface ReviewCandidateResult {
  lessonId: string;
  title: string;
}

export class RecommendationRepository {
  /**
   * Priority 1 — a lesson the child has started (IN_PROGRESS) but not
   * finished. Resuming it is always the strongest next action.
   */
  async findIncompleteLesson(childId: string): Promise<IncompleteLessonResult | null> {
    const progress = await prisma.lessonProgress.findFirst({
      where: { childId, status: 'IN_PROGRESS', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: { lesson: { select: { id: true, title: true } } },
    });
    if (!progress || !progress.lesson) return null;
    return { lessonId: progress.lesson.id, title: progress.lesson.title };
  }

  /**
   * Priority 2 — the most recent completed assessment attempt that fell
   * below the mastery threshold (AssessmentAttempt has no FAILED status, so
   * we derive "failed" from the percentage).
   */
  async findFailedAssessmentAttempt(
    childId: string,
    thresholdPct: number
  ): Promise<FailedAssessmentResult | null> {
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: {
        childId,
        status: 'COMPLETED',
        percentage: { lt: thresholdPct },
        deletedAt: null,
      },
      orderBy: { completedAt: 'desc' },
      include: { assessment: { select: { id: true, title: true } } },
    });
    if (!attempt || !attempt.assessment) return null;
    return {
      assessmentId: attempt.assessment.id,
      title: attempt.assessment.title,
      percentage: attempt.percentage,
    };
  }

  /**
   * Priority 3 — the child's weakest skill (lowest masteryScore among
   * non-mastered/non-strong states). Practicing it yields the highest
   * learning gain.
   */
  async findWeakestSkill(childId: string): Promise<WeakSkillResult | null> {
    const skill = await prisma.skillHealth.findFirst({
      where: {
        childId,
        masteryState: {
          in: [MasteryState.NEW, MasteryState.LEARNING, MasteryState.WEAK],
        },
      },
      orderBy: { masteryScore: 'asc' },
      include: { skill: { select: { id: true, name: true } } },
    });
    if (!skill || !skill.skill) return null;
    return {
      skillId: skill.skill.id,
      name: skill.skill.name,
      masteryScore: skill.masteryScore,
    };
  }

  /**
   * Priority 5 — the next reward the child is close to unlocking: a sticker
   * whose `requiredStars` exceeds the child's current total but is the
   * smallest such gap, ignoring stickers already unlocked.
   */
  async findNextStickerReward(childId: string): Promise<StickerRewardResult | null> {
    const stars = await prisma.stars.findUnique({ where: { childId } });
    const totalStars = stars?.totalStars ?? 0;

    const unlocked = await prisma.childSticker.findMany({
      where: { childId },
      select: { stickerId: true },
    });
    const unlockedIds = new Set(unlocked.map((u) => u.stickerId));

    const candidates = await prisma.sticker.findMany({
      where: { requiredStars: { gt: totalStars } },
      orderBy: { requiredStars: 'asc' },
      take: 5,
    });

    const next = candidates.find((s) => !unlockedIds.has(s.id));
    if (!next) return null;
    return {
      stickerId: next.id,
      name: next.name,
      requiredStars: next.requiredStars,
      currentStars: totalStars,
    };
  }

  /**
   * Priority 6 — a lesson the child completed a long time ago and has not
   * touched since. A short refresher keeps the skill from decaying.
   */
  async findReviewCandidate(
    childId: string,
    inactivityDays: number
  ): Promise<ReviewCandidateResult | null> {
    const cutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);
    const progress = await prisma.lessonProgress.findFirst({
      where: {
        childId,
        status: 'COMPLETED',
        completedAt: { lt: cutoff },
        deletedAt: null,
      },
      orderBy: { completedAt: 'asc' },
      include: { lesson: { select: { id: true, title: true } } },
    });
    if (!progress || !progress.lesson) return null;
    return { lessonId: progress.lesson.id, title: progress.lesson.title };
  }
}

export const recommendationRepository = new RecommendationRepository();
