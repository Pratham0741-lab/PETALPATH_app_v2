import { prisma } from '../../config/database.js';
import {
  AnalyticsMetricType,
  TrendEventType,
  MasteryState,
  SessionStatus,
} from '../../shared/enums.js';
import { analyticsSnapshotRepository } from './repositories/analytics-snapshot.repository.js';
import { analyticsHistoryRepository } from './repositories/analytics-history.repository.js';
import { trendEventRepository } from './repositories/trend-event.repository.js';
import { subjectAnalyticsRepository } from './repositories/subject-analytics.repository.js';
import { analyticsReadRepository } from './repositories/analytics-read.repository.js';
import { logger } from '../../utils/logger.js';
import { engineConfig } from '../../shared/config/engine.config.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { NotFoundError } from '../../utils/errors.js';

export class AnalyticsService {
  // ──────────────────────────────────────────────
  //  CORE METRIC CALCULATION METHODS
  // ──────────────────────────────────────────────

  async calculateAccuracy(childId: string): Promise<number> {
    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return engineConfig.analytics.baselines.accuracy;
    const sum = healths.reduce((acc, h) => acc + h.knowledgeScore, 0);
    return Math.round((sum / healths.length) * 100) / 100;
  }

  async calculateConfidence(childId: string): Promise<number> {
    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return engineConfig.analytics.baselines.confidence;
    const sum = healths.reduce((acc, h) => acc + h.confidenceScore, 0);
    return Math.round((sum / healths.length) * 100) / 100;
  }

  async calculateRetention(childId: string): Promise<number> {
    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return engineConfig.analytics.baselines.retention;
    const sum = healths.reduce((acc, h) => acc + h.retentionScore, 0);
    return Math.round((sum / healths.length) * 100) / 100;
  }

  async calculateEngagement(childId: string): Promise<number> {
    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return engineConfig.analytics.baselines.engagement;
    const sum = healths.reduce((acc, h) => acc + h.engagementScore, 0);
    return Math.round((sum / healths.length) * 100) / 100;
  }

  async calculateLearningVelocity(childId: string): Promise<number> {
    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) return engineConfig.analytics.baselines.velocityFallback;

    const daysElapsed = Math.max(
      1,
      Math.ceil((Date.now() - child.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return engineConfig.analytics.baselines.velocityDefault;

    const sumMastery = healths.reduce((acc, h) => acc + h.masteryScore, 0);
    const averageMastery = sumMastery / healths.length;

    // velocity = average mastery gain per day practicing
    return Math.round((averageMastery / daysElapsed) * 100) / 100;
  }

  async calculateSessionCompletionRate(childId: string): Promise<number> {
    const totalSessions = await prisma.sessionPlan.count({
      where: {
        childId,
        status: {
          in: [SessionStatus.STARTED, SessionStatus.COMPLETED, SessionStatus.ABANDONED] as any,
        },
      },
    });
    if (totalSessions === 0) return 100.0;

    const completed = await prisma.sessionPlan.count({
      where: {
        childId,
        status: SessionStatus.COMPLETED as any,
      },
    });

    return Math.round((completed / totalSessions) * 10000) / 100;
  }

  async calculateReinforcementSuccessRate(childId: string): Promise<number> {
    const totalReviews = await prisma.reinforcementHistory.count({
      where: { childId },
    });
    if (totalReviews === 0) return 100.0;

    const successful = await prisma.reinforcementHistory.count({
      where: { childId, success: true },
    });

    return Math.round((successful / totalReviews) * 10000) / 100;
  }

  // ──────────────────────────────────────────────
  //  AGGREGATE GENERATION
  // ──────────────────────────────────────────────

  /**
   * Generates a current metrics snapshot, updates history, and returns snapshot.
   */
  async generateSnapshot(childId: string) {
    const accuracy = await this.calculateAccuracy(childId);
    const confidence = await this.calculateConfidence(childId);
    const retention = await this.calculateRetention(childId);
    const engagement = await this.calculateEngagement(childId);
    const learningVelocity = await this.calculateLearningVelocity(childId);
    const sessionCompletionRate = await this.calculateSessionCompletionRate(childId);
    const reinforcementSuccessRate = await this.calculateReinforcementSuccessRate(childId);

    // Save/update snapshot
    const snapshot = await analyticsSnapshotRepository.upsert(childId, {
      accuracy,
      confidence,
      retention,
      engagement,
      learningVelocity,
      sessionCompletionRate,
      reinforcementSuccessRate,
    });

    // Time-bucket daily historical records
    await this.saveHistory(childId, snapshot);

    // Sync subject-specific analytics
    await this.calculateSubjectAnalytics(childId);

    // Run trend detection
    await this.detectTrends(childId, snapshot);

    return snapshot;
  }

  /**
   * Saves daily metrics to AnalyticsHistory using time-bucketing.
   */
  private async saveHistory(childId: string, snapshot: any) {
    const metricsMap = {
      [AnalyticsMetricType.ACCURACY]: snapshot.accuracy,
      [AnalyticsMetricType.CONFIDENCE]: snapshot.confidence,
      [AnalyticsMetricType.RETENTION]: snapshot.retention,
      [AnalyticsMetricType.ENGAGEMENT]: snapshot.engagement,
      [AnalyticsMetricType.LEARNING_VELOCITY]: snapshot.learningVelocity,
      [AnalyticsMetricType.SESSION_COMPLETION]: snapshot.sessionCompletionRate,
      [AnalyticsMetricType.REINFORCEMENT_SUCCESS]: snapshot.reinforcementSuccessRate,
    };

    for (const [metricType, val] of Object.entries(metricsMap)) {
      await analyticsHistoryRepository.upsertDailyMetric(
        childId,
        metricType as AnalyticsMetricType,
        val
      );
    }
  }

  // ──────────────────────────────────────────────
  //  TREND DETECTION
  // ──────────────────────────────────────────────

  /**
   * Evaluates child metrics against historical data to register events.
   */
  async detectTrends(childId: string, currentSnapshot: any) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch daily history from 7 days ago to compare
    const historyConfidence = await analyticsHistoryRepository.findAggregateInWindow(
      childId,
      AnalyticsMetricType.CONFIDENCE,
      sevenDaysAgo,
      sevenDaysAgo
    );
    const prevConfidence = historyConfidence[0]?.value ?? engineConfig.analytics.baselines.confidence;
    const confidenceDiff = currentSnapshot.confidence - prevConfidence;

    if (confidenceDiff >= 5.0) {
      await this.postTrendEventIfNeeded(childId, TrendEventType.CONFIDENCE_IMPROVING, {
        current: currentSnapshot.confidence,
        previous: prevConfidence,
      });
    } else if (confidenceDiff <= -5.0) {
      await this.postTrendEventIfNeeded(childId, TrendEventType.CONFIDENCE_DECLINING, {
        current: currentSnapshot.confidence,
        previous: prevConfidence,
      });
    }

    const historyRetention = await analyticsHistoryRepository.findAggregateInWindow(
      childId,
      AnalyticsMetricType.RETENTION,
      sevenDaysAgo,
      sevenDaysAgo
    );
    const prevRetention = historyRetention[0]?.value ?? engineConfig.analytics.baselines.retention;
    const retentionDiff = currentSnapshot.retention - prevRetention;

    if (retentionDiff >= 5.0) {
      await this.postTrendEventIfNeeded(childId, TrendEventType.RETENTION_IMPROVING, {
        current: currentSnapshot.retention,
        previous: prevRetention,
      });
    } else if (retentionDiff <= -5.0) {
      await this.postTrendEventIfNeeded(childId, TrendEventType.RETENTION_DECLINING, {
        current: currentSnapshot.retention,
        previous: prevRetention,
      });
    }

    // Check if regression log has new records in the last 24h
    const regressionCount = await prisma.regressionLog.count({
      where: {
        childId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (regressionCount > 0) {
      await this.postTrendEventIfNeeded(childId, TrendEventType.REGRESSION_DETECTED, {
        count: regressionCount,
      });
    }

    // Check session abandonment in last 24h
    const abandonedCount = await prisma.sessionPlan.count({
      where: {
        childId,
        status: 'ABANDONED' as any,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (abandonedCount > 0) {
      await this.postTrendEventIfNeeded(childId, TrendEventType.SESSION_ABANDONMENT, {
        count: abandonedCount,
      });
    }
  }

  private async postTrendEventIfNeeded(
    childId: string,
    eventType: TrendEventType,
    metadata: any
  ) {
    // Prevent duplicate logs of the same type within the last 24 hours
    const recent = await prisma.trendEvent.findFirst({
      where: {
        childId,
        eventType,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (!recent) {
      await trendEventRepository.create({ childId, eventType, metadata });
    }
  }

  // ──────────────────────────────────────────────
  //  INSIGHTS GENERATION
  // ──────────────────────────────────────────────

  /**
   * Primary source of truth is TrendEvent log.
   * Maps events to positive, non-judgmental parent observations.
   */
  async generateInsights(childId: string): Promise<string[]> {
    const recentEvents = await trendEventRepository.findRecent(childId, 5);
    const insights: string[] = [];

    const defaultObservations = [
      "Your child is actively exploring math and cognitive building blocks.",
      "A steady rhythm of daily sessions is reinforcing your child's confidence.",
    ];

    if (recentEvents.length === 0) {
      return defaultObservations;
    }

    for (const ev of recentEvents) {
      switch (ev.eventType) {
        case TrendEventType.CONFIDENCE_IMPROVING:
          insights.push(
            "Your child is becoming more confident during learning sessions. They tackle new skills with growing security!"
          );
          break;
        case TrendEventType.CONFIDENCE_DECLINING:
          insights.push(
            "Your child is working through more challenging concepts right now. Working through hurdles is where deep learning happens!"
          );
          break;
        case TrendEventType.RETENTION_IMPROVING:
          insights.push(
            "Previously practiced skills are sticking! Your child is showing excellent long-term memory retention."
          );
          break;
        case TrendEventType.RETENTION_DECLINING:
          insights.push(
            "A few skills are starting to fade. Setting aside a short session for review will solidify these building blocks."
          );
          break;
        case TrendEventType.REGRESSION_DETECTED:
          insights.push(
            "Encountering a regression is a natural part of mastering complex concepts. Reviewing these topics will build stronger foundation."
          );
          break;
        case TrendEventType.SESSION_ABANDONMENT:
          insights.push(
            "Taking breaks is a key part of self-regulation. Your child knows when to rest, showing good pacing!"
          );
          break;
        case TrendEventType.ENGAGEMENT_IMPROVING:
          insights.push(
            "Your child's curiosity is shining! They show high focus and active participation in recent play blocks."
          );
          break;
        default:
          break;
      }
    }

    // Deduplicate and fallback
    const uniqueInsights = Array.from(new Set(insights)).slice(0, 3);
    return uniqueInsights.length > 0 ? uniqueInsights : defaultObservations;
  }

  // ──────────────────────────────────────────────
  //  SUBJECT ANALYTICS
  // ──────────────────────────────────────────────

  async calculateSubjectAnalytics(childId: string) {
    const subjects = await prisma.subject.findMany();
    const results = [];

    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) return [];

    const daysElapsed = Math.max(
      1,
      Math.ceil((Date.now() - child.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    for (const subj of subjects) {
      const skills = await prisma.skill.findMany({ where: { subjectId: subj.id } });
      if (skills.length === 0) continue;

      const skillIds = skills.map((s) => s.id);
      const healths = await prisma.skillHealth.findMany({
        where: {
          childId,
          skillId: { in: skillIds },
        },
      });

      let accuracy = 80.0;
      let confidence = 70.0;
      let retention = 75.0;
      let learningVelocity = 0.5;

      if (healths.length > 0) {
        accuracy = healths.reduce((acc, h) => acc + h.knowledgeScore, 0) / healths.length;
        confidence = healths.reduce((acc, h) => acc + h.confidenceScore, 0) / healths.length;
        retention = healths.reduce((acc, h) => acc + h.retentionScore, 0) / healths.length;

        const sumMastery = healths.reduce((acc, h) => acc + h.masteryScore, 0);
        learningVelocity = sumMastery / healths.length / daysElapsed;
      }

      // Calculate progress: completed skills / total skills in subject
      // Completed means masteryScore >= 85
      const completed = healths.filter((h) => h.masteryScore >= engineConfig.analytics.subjectCompletionMasteryThreshold).length;
      const progress = Math.round((completed / skills.length) * 10000) / 100;

      const record = await subjectAnalyticsRepository.upsert(childId, subj.id, {
        accuracy: Math.round(accuracy * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        retention: Math.round(retention * 100) / 100,
        progress,
        learningVelocity: Math.round(learningVelocity * 100) / 100,
      });

      results.push(record);
    }

    return results;
  }

  // ──────────────────────────────────────────────
  //  REPORTS & TIME WINDOWS
  // ──────────────────────────────────────────────

  async generateReports(childId: string, window: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'LIFETIME') {
    const endDate = new Date();
    const startDate = new Date();

    switch (window) {
      case 'DAILY':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'WEEKLY':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'MONTHLY':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'LIFETIME':
        const child = await prisma.child.findUnique({ where: { id: childId } });
        if (child) {
          startDate.setTime(child.createdAt.getTime());
        } else {
          startDate.setDate(startDate.getDate() - 365);
        }
        break;
    }

    // Get time-bucket history entries inside this window
    const snapshot = await analyticsSnapshotRepository.findByChild(childId);
    const subjects = await subjectAnalyticsRepository.findByChild(childId);
    const insights = await this.generateInsights(childId);

    // Compute activity logs in this window
    const completedSessions = await prisma.sessionPlan.count({
      where: {
        childId,
        status: 'COMPLETED' as any,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalSessions = await prisma.sessionPlan.count({
      where: {
        childId,
        status: {
          in: ['STARTED', 'COMPLETED', 'ABANDONED'] as any,
        },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 100.0;

    return {
      window,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      completionRate: Math.round(completionRate * 100) / 100,
      sessionsCount: totalSessions,
      snapshot,
      subjects,
      insights,
    };
  }

  // ──────────────────────────────────────────────
  //  PARENT-FACING AGGREGATED ANALYTICS (Phase 3.3)
  //  Read-only rollups over progress, assessments,
  //  rewards, lessons, videos, speaking/listening/writing.
  // ──────────────────────────────────────────────

  async getOverview(childId: string) {
    return analyticsReadRepository.getOverview(childId);
  }

  async getActivity(childId: string, period: 'daily' | 'weekly' | 'monthly') {
    return analyticsReadRepository.getActivity(childId, period);
  }

  async getProgress(childId: string) {
    return analyticsReadRepository.getProgress(childId);
  }

  /**
   * Grade-scoped progress for the parent-locked analysis panel behind Explore.
   *
   * Returns exactly the three views the panel draws, each restricted to the
   * child's own grade (the same `originalGrade` scope the Explore garden uses):
   *   1. `accuracyBySubject` — today's accuracy and mastery per subject, from the
   *      live `SkillHealth` rows;
   *   2. `masteryTimeline`   — average mastery per day, from `SkillHistory`, so a
   *      parent sees the climb over time rather than a single number;
   *   3. `beforeAfter`       — earliest vs. latest recorded mastery, overall and
   *      per subject, i.e. "where they started" against "where they are now".
   *
   * Scores are normalized to a 0-100 percentage: the sub-scores (knowledge,
   * confidence …) are stored 0-1 while `masteryScore` is already 0-100, so any
   * value at or below 1 is read as a fraction and scaled up.
   */
  async getGradeProgress(childId: string) {
    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeKey = curriculumService.resolveChildGrade(child);
    const gradeNumber = curriculumService.resolveChildGradeNumber(child);
    const gradeTitle = curriculumService.getCurriculumByGrade(gradeKey)?.grade?.name ?? gradeKey;

    const toPct = (v: number): number => Math.round((v <= 1 ? v * 100 : v) * 10) / 10;

    // Grade-scoped skills, by the grade's authoritative skill-code set (originalGrade
    // is null in the seeded data, so it can't be the filter). Falls back to
    // originalGrade only when the grade has no curriculum on disk.
    const gradeSkillCodes = curriculumService.getGradeSkillCodes(gradeKey);
    const skills = await prisma.skill.findMany({
      where:
        gradeSkillCodes.size > 0
          ? { skillCode: { in: Array.from(gradeSkillCodes) } }
          : { OR: [{ originalGrade: gradeNumber }, { originalGrade: null }] },
      select: { id: true, subjectId: true, subject: { select: { id: true, name: true } } },
    });
    const skillById = new Map(skills.map((s) => [s.id, s]));
    const skillIds = skills.map((s) => s.id);

    if (skillIds.length === 0) {
      return {
        grade: { key: gradeKey, number: gradeNumber, title: gradeTitle },
        accuracyBySubject: [],
        masteryTimeline: [],
        beforeAfter: { overall: { before: 0, after: 0 }, bySubject: [] },
      };
    }

    const [healths, histories] = await Promise.all([
      prisma.skillHealth.findMany({ where: { childId, skillId: { in: skillIds } } }),
      prisma.skillHistory.findMany({
        where: { childId, skillId: { in: skillIds } },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    // ---- 1) accuracy + current mastery, grouped by subject ----
    interface SubjAcc {
      subjectId: string;
      subject: string;
      accuracySum: number;
      masterySum: number;
      count: number;
    }
    const bySubject = new Map<string, SubjAcc>();
    for (const h of healths) {
      const skill = skillById.get(h.skillId);
      if (!skill?.subject) continue;
      const key = skill.subject.id;
      const row =
        bySubject.get(key) ??
        { subjectId: key, subject: skill.subject.name, accuracySum: 0, masterySum: 0, count: 0 };
      row.accuracySum += toPct(h.knowledgeScore);
      row.masterySum += toPct(h.masteryScore);
      row.count += 1;
      bySubject.set(key, row);
    }
    const accuracyBySubject = Array.from(bySubject.values())
      .map((r) => ({
        subjectId: r.subjectId,
        subject: r.subject,
        accuracy: Math.round((r.accuracySum / r.count) * 10) / 10,
        mastery: Math.round((r.masterySum / r.count) * 10) / 10,
        skillCount: r.count,
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject));

    // ---- 2) mastery timeline: mean mastery per calendar day ----
    const byDay = new Map<string, { sum: number; count: number }>();
    for (const h of histories) {
      const day = h.timestamp.toISOString().slice(0, 10);
      const bucket = byDay.get(day) ?? { sum: 0, count: 0 };
      bucket.sum += toPct(h.masteryScore);
      bucket.count += 1;
      byDay.set(day, bucket);
    }
    const masteryTimeline = Array.from(byDay.entries())
      .map(([date, b]) => ({ date, mastery: Math.round((b.sum / b.count) * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ---- 3) before/after: earliest vs latest recorded mastery per skill ----
    // Histories are already ascending, so the first row seen for a skill is its
    // earliest and the last is its latest.
    const firstBySkill = new Map<string, number>();
    const lastBySkill = new Map<string, number>();
    for (const h of histories) {
      if (!firstBySkill.has(h.skillId)) firstBySkill.set(h.skillId, toPct(h.masteryScore));
      lastBySkill.set(h.skillId, toPct(h.masteryScore));
    }
    interface SubjBA {
      subjectId: string;
      subject: string;
      beforeSum: number;
      afterSum: number;
      count: number;
    }
    const baBySubject = new Map<string, SubjBA>();
    let overallBefore = 0;
    let overallAfter = 0;
    let overallCount = 0;
    for (const skillId of firstBySkill.keys()) {
      const skill = skillById.get(skillId);
      if (!skill?.subject) continue;
      const before = firstBySkill.get(skillId)!;
      const after = lastBySkill.get(skillId)!;
      overallBefore += before;
      overallAfter += after;
      overallCount += 1;
      const key = skill.subject.id;
      const row =
        baBySubject.get(key) ??
        { subjectId: key, subject: skill.subject.name, beforeSum: 0, afterSum: 0, count: 0 };
      row.beforeSum += before;
      row.afterSum += after;
      row.count += 1;
      baBySubject.set(key, row);
    }
    const beforeAfter = {
      overall: {
        before: overallCount ? Math.round((overallBefore / overallCount) * 10) / 10 : 0,
        after: overallCount ? Math.round((overallAfter / overallCount) * 10) / 10 : 0,
      },
      bySubject: Array.from(baBySubject.values())
        .map((r) => ({
          subjectId: r.subjectId,
          subject: r.subject,
          before: Math.round((r.beforeSum / r.count) * 10) / 10,
          after: Math.round((r.afterSum / r.count) * 10) / 10,
        }))
        .sort((a, b) => a.subject.localeCompare(b.subject)),
    };

    return {
      grade: { key: gradeKey, number: gradeNumber, title: gradeTitle },
      accuracyBySubject,
      masteryTimeline,
      beforeAfter,
    };
  }

  async getRewards(childId: string) {
    return analyticsReadRepository.getRewards(childId);
  }

  async getTimeline(childId: string, page: number, limit: number) {
    return analyticsReadRepository.getTimeline(childId, page, limit);
  }

  async getLearnerAnalytics(childId: string): Promise<any> {
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

    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const lessonIds = lessons.map((l) => l.id);

    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: lessonIds } },
    });

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });

    const rewards = await prisma.reward.findMany({
      where: { childId },
    });

    const completedLessons = progressList.filter((p) => p.status === 'COMPLETED').length;
    const totalLessons = lessons.length;
    const overallCompletionPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    let completedThemes = 0;
    for (const theme of gradeCurriculum.themes) {
      const themeLessonIds = theme.nodes.map((n) => n.id);
      const themeCompletedCount = progressList.filter(
        (p) => themeLessonIds.includes(p.lessonId) && p.status === 'COMPLETED'
      ).length;
      if (themeCompletedCount === theme.nodes.length && theme.nodes.length > 0) {
        completedThemes++;
      }
    }

    const overallMasterySum = knowledgeStates.reduce((sum, k) => sum + k.mastery, 0);
    const overallMastery = lessons.length > 0 ? Math.round(overallMasterySum / lessons.length) : 0;

    const totalXP = rewards.reduce((sum, r) => sum + r.points, 0);
    const totalStars = progressList.reduce((sum, p) => sum + (p.totalStars ?? 0), 0);

    return {
      childId,
      overallCompletionPercentage,
      overallMastery,
      totalXP,
      totalStars,
      completedLessons,
      completedThemes,
    };
  }

  async getLearnerTrends(childId: string): Promise<any> {
    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundError('Child not found');

    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, status: 'COMPLETED' },
      orderBy: { completedAt: 'asc' },
    });

    const rewards = await prisma.reward.findMany({
      where: { childId },
      orderBy: { createdAt: 'asc' },
    });

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
      orderBy: { lastTransitionAt: 'asc' },
    });

    // Map by date to track cumulative values
    const dateMap = new Map<string, { xp: number; stars: number; lessons: number; masterySum: number; masteryCount: number }>();

    rewards.forEach((r) => {
      const dateStr = r.createdAt.toISOString().split('T')[0];
      const existing = dateMap.get(dateStr) || { xp: 0, stars: 0, lessons: 0, masterySum: 0, masteryCount: 0 };
      existing.xp += r.points;
      dateMap.set(dateStr, existing);
    });

    progressList.forEach((p) => {
      const dateStr = p.completedAt!.toISOString().split('T')[0];
      const existing = dateMap.get(dateStr) || { xp: 0, stars: 0, lessons: 0, masterySum: 0, masteryCount: 0 };
      existing.stars += p.totalStars ?? 0;
      existing.lessons += 1;
      dateMap.set(dateStr, existing);
    });

    knowledgeStates.forEach((ks) => {
      const dateStr = ks.lastTransitionAt!.toISOString().split('T')[0];
      const existing = dateMap.get(dateStr) || { xp: 0, stars: 0, lessons: 0, masterySum: 0, masteryCount: 0 };
      existing.masterySum += ks.mastery;
      existing.masteryCount += 1;
      dateMap.set(dateStr, existing);
    });

    const sortedDates = Array.from(dateMap.keys()).sort();

    let cumulativeXP = 0;
    let cumulativeStars = 0;
    let completedLessonsCount = 0;
    let rollingMasterySum = 0;
    let rollingMasteryCount = 0;

    const trends = sortedDates.map((date) => {
      const bucket = dateMap.get(date)!;
      cumulativeXP += bucket.xp;
      cumulativeStars += bucket.stars;
      completedLessonsCount += bucket.lessons;
      rollingMasterySum += bucket.masterySum;
      rollingMasteryCount += bucket.masteryCount;

      const averageMastery = rollingMasteryCount > 0 ? Math.round(rollingMasterySum / rollingMasteryCount) : 0;

      return {
        date,
        cumulativeXP,
        cumulativeStars,
        completedLessonsCount,
        averageMastery,
      };
    });

    return {
      childId,
      trends,
    };
  }

  async getClassroomAnalytics(classroomId: string): Promise<any> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: {
          include: {
            child: {
              include: {
                lessonProgress: true,
                knowledgeStates: true,
                rewards: true,
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return {
        classroomId,
        averageCompletionPercentage: 0,
        averageMastery: 0,
        totalXP: 0,
        totalStars: 0,
        activeLearnersCount: 0,
        learnersCompletionRate: [],
        masteryDistribution: [],
      };
    }

    let totalXP = 0;
    let totalStars = 0;
    let activeLearnersCount = 0;
    let completionPercentageSum = 0;
    let averageMasterySum = 0;

    const learnersCompletionRate: any[] = [];
    const masteryRanges = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100

    for (const enrollment of learners) {
      const child = enrollment.child;
      const progressList = child.lessonProgress;
      const knowledgeStates = child.knowledgeStates;

      if (progressList.length > 0) {
        activeLearnersCount++;
      }

      const gradeId = curriculumService.resolveChildGrade(child);
      const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
      const totalLessons = lessons.length;
      const completed = progressList.filter((p) => p.status === 'COMPLETED').length;
      const childPct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      completionPercentageSum += childPct;

      learnersCompletionRate.push({
        childId: child.id,
        childName: child.name,
        percentage: childPct,
      });

      const childMasterySum = knowledgeStates.reduce((sum, k) => sum + k.mastery, 0);
      const childAvgMastery = lessons.length > 0 ? Math.round(childMasterySum / lessons.length) : 0;
      averageMasterySum += childAvgMastery;

      // Group into distribution
      if (childAvgMastery <= 20) masteryRanges[0]++;
      else if (childAvgMastery <= 40) masteryRanges[1]++;
      else if (childAvgMastery <= 60) masteryRanges[2]++;
      else if (childAvgMastery <= 80) masteryRanges[3]++;
      else masteryRanges[4]++;

      totalXP += child.rewards.reduce((sum, r) => sum + r.points, 0);
      totalStars += progressList.reduce((sum, p) => sum + (p.totalStars ?? 0), 0);
    }

    const averageCompletionPercentage = Math.round(completionPercentageSum / learners.length);
    const averageMastery = Math.round(averageMasterySum / learners.length);

    const masteryDistribution = [
      { range: '0-20%', studentCount: masteryRanges[0] },
      { range: '21-40%', studentCount: masteryRanges[1] },
      { range: '41-60%', studentCount: masteryRanges[2] },
      { range: '61-80%', studentCount: masteryRanges[3] },
      { range: '81-100%', studentCount: masteryRanges[4] },
    ];

    return {
      classroomId,
      averageCompletionPercentage,
      averageMastery,
      totalXP,
      totalStars,
      activeLearnersCount,
      learnersCompletionRate,
      masteryDistribution,
    };
  }

  async getClassroomTrends(classroomId: string): Promise<any> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: true,
      },
    });
    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return { classroomId, trends: [] };
    }

    // Merge student progress trends by date
    const dateAccumulator = new Map<string, { xpSum: number; starsSum: number; lessonsSum: number; count: number }>();

    for (const enrollment of learners) {
      const childTrends = await this.getLearnerTrends(enrollment.childId);
      childTrends.trends.forEach((t: any) => {
        const existing = dateAccumulator.get(t.date) || { xpSum: 0, starsSum: 0, lessonsSum: 0, count: 0 };
        existing.xpSum += t.cumulativeXP;
        existing.starsSum += t.cumulativeStars;
        existing.lessonsSum += t.completedLessonsCount;
        existing.count++;
        dateAccumulator.set(t.date, existing);
      });
    }

    const sortedDates = Array.from(dateAccumulator.keys()).sort();
    const trends = sortedDates.map((date) => {
      const bucket = dateAccumulator.get(date)!;
      return {
        date,
        cumulativeXP: bucket.xpSum,
        cumulativeStars: bucket.starsSum,
        completedLessonsCount: bucket.lessonsSum,
        averageMastery: 0,
      };
    });

    return {
      classroomId,
      trends,
    };
  }

  async getCurriculumAnalytics(gradeId: string, teacherUserId?: string): Promise<any> {
    const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
    if (!gradeCurriculum) {
      throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
    }

    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const lessonIds = lessons.map((l) => l.id);

    // If teacherUserId is specified, filter by students enrolled in that teacher's classrooms
    let targetChildIds: string[] | undefined;
    if (teacherUserId) {
      const enrolled = await prisma.classroomLearner.findMany({
        where: { classroom: { teacherId: teacherUserId } },
      });
      targetChildIds = enrolled.map((e) => e.childId);
    }

    // Query completions
    const progressList = await prisma.lessonProgress.findMany({
      where: {
        lessonId: { in: lessonIds },
        childId: targetChildIds ? { in: targetChildIds } : undefined,
      },
    });

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: {
        topicId: { in: lessonIds },
        childId: targetChildIds ? { in: targetChildIds } : undefined,
      },
    });

    // Calculations
    const lessonCompletionCount = progressList.filter((p) => p.status === 'COMPLETED').length;
    // Average completion percentage overall
    const studentCount = targetChildIds ? targetChildIds.length : (await prisma.child.count());
    const totalCompletionsPossible = lessons.length * (studentCount || 1);
    const lessonCompletionRate = totalCompletionsPossible > 0 ? Math.round((lessonCompletionCount / totalCompletionsPossible) * 100) : 0;

    // Theme completions
    const themeCompletions = gradeCurriculum.themes.map((theme) => {
      const themeLessonIds = theme.nodes.map((n) => n.id);
      const totalThemePossible = themeLessonIds.length * (studentCount || 1);
      const completedCount = progressList.filter(
        (p) => themeLessonIds.includes(p.lessonId) && p.status === 'COMPLETED'
      ).length;
      return {
        themeId: theme.id,
        title: theme.title,
        completionRate: totalThemePossible > 0 ? Math.round((completedCount / totalThemePossible) * 100) : 0,
      };
    });

    // Subject completions
    const subjectMap = new Map<string, { completed: number; total: number }>();
    lessons.forEach((node) => {
      const subject = node.curriculum.subject || 'Other';
      const stats = subjectMap.get(subject) || { completed: 0, total: 0 };
      stats.total += (studentCount || 1);
      stats.completed += progressList.filter((p) => p.lessonId === node.id && p.status === 'COMPLETED').length;
      subjectMap.set(subject, stats);
    });
    const subjectCompletions = Array.from(subjectMap.entries()).map(([subject, val]) => ({
      subject,
      completionRate: val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0,
    }));

    // Average mastery by curriculum level (difficulty)
    const difficultyMap = new Map<string, { totalMastery: number; count: number }>();
    lessons.forEach((node) => {
      const difficulty = node.difficulty?.toString() || 'EASY';
      const stats = difficultyMap.get(difficulty) || { totalMastery: 0, count: 0 };
      const lessonKS = knowledgeStates.filter((k) => k.topicId === node.id);
      stats.totalMastery += lessonKS.reduce((sum, k) => sum + k.mastery, 0);
      stats.count += (studentCount || 1);
      difficultyMap.set(difficulty, stats);
    });
    const averageMasteryByCurriculumLevel = Array.from(difficultyMap.entries()).map(([level, val]) => ({
      level,
      averageMastery: val.count > 0 ? Math.round(val.totalMastery / val.count) : 0,
    }));

    return {
      gradeId,
      lessonCompletionRate,
      themeCompletions,
      subjectCompletions,
      averageMasteryByCurriculumLevel,
    };
  }

  async getAssessmentAnalytics(assessmentId: string, teacherUserId?: string): Promise<any> {
    const lessonAssessment = curriculumService.getAssessment(assessmentId);
    const title = lessonAssessment ? lessonAssessment.title : 'Placement Assessment';

    let targetChildIds: string[] | undefined;
    if (teacherUserId) {
      const enrolled = await prisma.classroomLearner.findMany({
        where: { classroom: { teacherId: teacherUserId } },
      });
      targetChildIds = enrolled.map((e) => e.childId);
    }

    const completedAttempts = await prisma.assessmentAttempt.findMany({
      where: {
        assessmentId,
        status: 'COMPLETED',
        childId: targetChildIds ? { in: targetChildIds } : undefined,
      },
    });

    const studentCount = targetChildIds ? targetChildIds.length : (await prisma.child.count());
    const completionRate = studentCount > 0 ? Math.round((completedAttempts.length / studentCount) * 100) : 0;

    const scoredAttempts = completedAttempts.filter((a) => a.percentage !== null);
    const sum = scoredAttempts.reduce((acc, a) => acc + (a.percentage ?? 0), 0);
    const averageScore = scoredAttempts.length > 0 ? Math.round(sum / scoredAttempts.length) : 0;

    let highestScore = 0;
    const scoreRanges = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
    scoredAttempts.forEach((a) => {
      const percentage = a.percentage ?? 0;
      if (percentage > highestScore) {
        highestScore = percentage;
      }
      if (percentage <= 20) scoreRanges[0]++;
      else if (percentage <= 40) scoreRanges[1]++;
      else if (percentage <= 60) scoreRanges[2]++;
      else if (percentage <= 80) scoreRanges[3]++;
      else scoreRanges[4]++;
    });

    const scoreDistribution = [
      { range: '0-20%', count: scoreRanges[0] },
      { range: '21-40%', count: scoreRanges[1] },
      { range: '41-60%', count: scoreRanges[2] },
      { range: '61-80%', count: scoreRanges[3] },
      { range: '81-100%', count: scoreRanges[4] },
    ];

    // Mastery distribution based on KnowledgeState topicId of the assessment's lesson
    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: {
        topicId: assessmentId,
        childId: targetChildIds ? { in: targetChildIds } : undefined,
      },
    });

    const masteryMap = new Map<string, number>();
    knowledgeStates.forEach((ks) => {
      const state = ks.state || 'LEARNING';
      masteryMap.set(state, (masteryMap.get(state) || 0) + 1);
    });

    const masteryDistribution = Array.from(masteryMap.entries()).map(([state, count]) => ({
      state,
      count,
    }));

    return {
      assessmentId,
      title,
      completionRate,
      averageScore,
      highestScore,
      scoreDistribution,
      masteryDistribution,
    };
  }
}

export const analyticsService = new AnalyticsService();
