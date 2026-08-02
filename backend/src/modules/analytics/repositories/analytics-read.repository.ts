import { prisma } from '../../../config/database.js';
import {
  ActivityPeriod,
  ActivitySeries,
  ActivityBucket,
  OverviewMetrics,
  ProgressSummary,
  RewardsSummary,
  TimelineItem,
  TimelineResult,
  LessonCompletionPoint,
} from '../analytics.types.js';

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function isoWeekKey(d: Date): string {
  // ISO-8601 week number
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${date.getUTCFullYear()}-W${pad(week)}`;
}

function keyFor(period: ActivityPeriod, d: Date): string {
  if (period === 'daily') return dayKey(d);
  if (period === 'monthly') return monthKey(d);
  return isoWeekKey(d);
}

function buildBuckets(period: ActivityPeriod): { windowStart: Date; buckets: ActivityBucket[] } {
  const now = new Date();
  const buckets: ActivityBucket[] = [];

  if (period === 'daily') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = dayKey(d);
      buckets.push({
        key,
        label: key,
        lessonCompletions: 0,
        assessmentCompletions: 0,
        rewards: 0,
        total: 0,
      });
    }
    return { windowStart: start, buckets };
  }

  if (period === 'monthly') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const key = monthKey(d);
      buckets.push({
        key,
        label: key,
        lessonCompletions: 0,
        assessmentCompletions: 0,
        rewards: 0,
        total: 0,
      });
    }
    return { windowStart: start, buckets };
  }

  // weekly — last 8 ISO weeks ending current week
  const buckets2: ActivityBucket[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i * 7));
    const key = isoWeekKey(d);
    buckets2.push({
      key,
      label: key,
      lessonCompletions: 0,
      assessmentCompletions: 0,
      rewards: 0,
      total: 0,
    });
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7 * 7));
  return { windowStart: start, buckets: buckets2 };
}

export class AnalyticsReadRepository {
  async getOverview(childId: string): Promise<OverviewMetrics> {
    const [lessonsStarted, lessonsCompleted, assessmentsCompleted, scoreAgg, stars, badges, stickers, videoDurations] =
      await Promise.all([
        prisma.lessonProgress.count({
          where: { childId, status: { in: ['IN_PROGRESS', 'COMPLETED'] }, deletedAt: null },
        }),
        prisma.lessonProgress.count({ where: { childId, status: 'COMPLETED', deletedAt: null } }),
        prisma.assessmentAttempt.count({ where: { childId, status: 'COMPLETED', deletedAt: null } }),
        prisma.assessmentAttempt.aggregate({
          where: { childId, status: 'COMPLETED', deletedAt: null, percentage: { not: null } },
          _avg: { percentage: true },
        }),
        prisma.stars.findUnique({ where: { childId }, select: { totalStars: true } }),
        prisma.childBadge.count({ where: { childId } }),
        prisma.childSticker.count({ where: { childId } }),
        prisma.videoProgress.findMany({
          where: { childId, isCompleted: true },
          select: { video: { select: { duration: true } } },
        }),
      ]);

    const averageAssessmentScore =
      scoreAgg._avg.percentage !== null && scoreAgg._avg.percentage !== undefined ? Math.round(scoreAgg._avg.percentage * 100) / 100 : 0;
    const completionPercentage =
      lessonsStarted > 0 ? Math.round((lessonsCompleted / lessonsStarted) * 100) : 0;
    const totalLearningMinutes = Math.round(
      videoDurations.reduce((acc, v) => acc + (v.video?.duration ?? 0), 0) / 60
    );

    return {
      lessonsCompleted,
      lessonsStarted,
      completionPercentage,
      assessmentsCompleted,
      averageAssessmentScore,
      totalStars: stars?.totalStars ?? 0,
      totalBadges: badges,
      totalStickers: stickers,
      totalLearningMinutes,
    };
  }

  async getActivity(childId: string, period: ActivityPeriod): Promise<ActivitySeries> {
    const { windowStart, buckets: bucketDefs } = buildBuckets(period);
    const [lessons, assessments, rewards] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { childId, status: 'COMPLETED', completedAt: { gte: windowStart }, deletedAt: null },
        select: { completedAt: true },
      }),
      prisma.assessmentAttempt.findMany({
        where: { childId, status: 'COMPLETED', completedAt: { gte: windowStart }, deletedAt: null },
        select: { completedAt: true },
      }),
      prisma.reward.findMany({
        where: { childId, earnedAt: { gte: windowStart } },
        select: { earnedAt: true },
      }),
    ]);

    const map = new Map<string, ActivityBucket>();
    for (const b of bucketDefs) {
      map.set(b.key, { ...b, lessonCompletions: 0, assessmentCompletions: 0, rewards: 0, total: 0 });
    }

    const bump = (date: Date | null, field: 'lessonCompletions' | 'assessmentCompletions' | 'rewards') => {
      if (!date) return;
      const entry = map.get(keyFor(period, date));
      if (entry) entry[field] += 1;
    };

    lessons.forEach((l) => bump(l.completedAt, 'lessonCompletions'));
    assessments.forEach((a) => bump(a.completedAt, 'assessmentCompletions'));
    rewards.forEach((r) => bump(r.earnedAt, 'rewards'));

    const buckets = bucketDefs.map((b) => {
      const entry = map.get(b.key)!;
      entry.total = entry.lessonCompletions + entry.assessmentCompletions + entry.rewards;
      return entry;
    });

    return { period, buckets };
  }

  async getProgress(childId: string): Promise<ProgressSummary> {
    const completed = await prisma.lessonProgress.findMany({
      where: { childId, status: 'COMPLETED', completedAt: { not: null }, deletedAt: null },
      select: { completedAt: true },
      orderBy: { completedAt: 'asc' },
    });

    const byDay = new Map<string, number>();
    for (const c of completed) {
      const d = c.completedAt!;
      const k = dayKey(d);
      byDay.set(k, (byDay.get(k) ?? 0) + 1);
    }

    const lessonTrend: LessonCompletionPoint[] = [];
    let cumulative = 0;
    for (const k of Array.from(byDay.keys()).sort()) {
      const count = byDay.get(k)!;
      cumulative += count;
      lessonTrend.push({ date: k, count, cumulative });
    }

    const [
      completedModules,
      totalModules,
      completedCategories,
      totalCategories,
      assessmentsCompleted,
      scoreAgg,
    ] = await Promise.all([
      prisma.moduleProgress.count({ where: { childId, isCompleted: true } }),
      prisma.module.count({ where: { deletedAt: null } }),
      prisma.categoryProgress.count({ where: { childId, isCompleted: true } }),
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.assessmentAttempt.count({ where: { childId, status: 'COMPLETED', deletedAt: null } }),
      prisma.assessmentAttempt.aggregate({
        where: { childId, status: 'COMPLETED', deletedAt: null, percentage: { not: null } },
        _avg: { percentage: true },
      }),
    ]);

    const averageScore = scoreAgg._avg.percentage !== null && scoreAgg._avg.percentage !== undefined ? Math.round(scoreAgg._avg.percentage * 100) / 100 : 0;

    return {
      lessonTrend,
      modules: { completed: completedModules, total: totalModules },
      categories: { completed: completedCategories, total: totalCategories },
      assessments: { completed: assessmentsCompleted, averageScore },
    };
  }

  async getRewards(childId: string): Promise<RewardsSummary> {
    const [starsRow, badges, stickers, recent] = await Promise.all([
      prisma.stars.findUnique({ where: { childId }, select: { totalStars: true } }),
      prisma.childBadge.findMany({
        where: { childId },
        include: { badge: { select: { id: true, name: true } } },
      }),
      prisma.childSticker.findMany({
        where: { childId },
        include: { sticker: { select: { id: true, name: true } } },
      }),
      prisma.reward.findMany({
        where: { childId },
        orderBy: { earnedAt: 'desc' },
        take: 10,
        select: { id: true, title: true, points: true, earnedAt: true },
      }),
    ]);

    return {
      stars: starsRow?.totalStars ?? 0,
      badges: { total: badges.length, items: badges.map((b) => ({ id: b.badge.id, name: b.badge.name })) },
      stickers: {
        total: stickers.length,
        items: stickers.map((s) => ({ id: s.sticker.id, name: s.sticker.name })),
      },
      recentRewards: recent.map((r) => ({
        id: r.id,
        title: r.title,
        points: r.points,
        earnedAt: r.earnedAt.toISOString(),
      })),
    };
  }

  async getTimeline(childId: string, page: number, limit: number): Promise<TimelineResult> {
    const take = Math.min(page * limit, 200);

    const [lessons, assessments, rewards, videos] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { childId, status: 'COMPLETED', completedAt: { not: null }, deletedAt: null },
        include: { lesson: { select: { title: true } } },
        orderBy: { completedAt: 'desc' },
        take,
      }),
      prisma.assessmentAttempt.findMany({
        where: { childId, status: 'COMPLETED', completedAt: { not: null }, deletedAt: null },
        include: { assessment: { select: { title: true } } },
        orderBy: { completedAt: 'desc' },
        take,
      }),
      prisma.reward.findMany({
        where: { childId },
        orderBy: { earnedAt: 'desc' },
        take,
        select: { id: true, title: true, points: true, earnedAt: true },
      }),
      prisma.videoProgress.findMany({
        where: { childId, isCompleted: true },
        include: { video: { select: { title: true } } },
        orderBy: { lastWatchedAt: 'desc' },
        take,
      }),
    ]);

    const items: TimelineItem[] = [];

    for (const l of lessons) {
      items.push({
        id: l.id,
        type: 'LESSON_COMPLETED',
        title: l.lesson?.title ?? 'Lesson',
        timestamp: (l.completedAt as Date).toISOString(),
      });
    }
    for (const a of assessments) {
      items.push({
        id: a.id,
        type: 'ASSESSMENT_COMPLETED',
        title: a.assessment?.title ?? 'Assessment',
        timestamp: (a.completedAt as Date).toISOString(),
        details: { percentage: a.percentage, score: a.score, maxScore: a.maxScore },
      });
    }
    for (const r of rewards) {
      items.push({
        id: r.id,
        type: 'REWARD_EARNED',
        title: r.title,
        timestamp: r.earnedAt.toISOString(),
        details: { points: r.points },
      });
    }
    for (const v of videos) {
      items.push({
        id: v.id,
        type: 'VIDEO_WATCHED',
        title: v.video?.title ?? 'Video',
        timestamp: (v.lastWatchedAt as Date).toISOString(),
      });
    }

    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = items.length;
    const start = (page - 1) * limit;
    const data = items.slice(start, start + limit);
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    return {
      data,
      pagination: { page, limit, total, totalPages },
    };
  }
}

export const analyticsReadRepository = new AnalyticsReadRepository();
