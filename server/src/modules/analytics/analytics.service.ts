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
import { logger } from '../../utils/logger.js';

export class AnalyticsService {
  // ──────────────────────────────────────────────
  //  CORE METRIC CALCULATION METHODS
  // ──────────────────────────────────────────────

  async calculateAccuracy(childId: string): Promise<number> {
    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return 80.0; // Default baseline accuracy
    const sum = healths.reduce((acc, h) => acc + h.knowledgeScore, 0);
    return Math.round((sum / healths.length) * 100) / 100;
  }

  async calculateConfidence(childId: string): Promise<number> {
    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return 70.0;
    const sum = healths.reduce((acc, h) => acc + h.confidenceScore, 0);
    return Math.round((sum / healths.length) * 100) / 100;
  }

  async calculateRetention(childId: string): Promise<number> {
    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return 75.0;
    const sum = healths.reduce((acc, h) => acc + h.retentionScore, 0);
    return Math.round((sum / healths.length) * 100) / 100;
  }

  async calculateEngagement(childId: string): Promise<number> {
    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return 80.0;
    const sum = healths.reduce((acc, h) => acc + h.engagementScore, 0);
    return Math.round((sum / healths.length) * 100) / 100;
  }

  async calculateLearningVelocity(childId: string): Promise<number> {
    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) return 1.0;

    const daysElapsed = Math.max(
      1,
      Math.ceil((Date.now() - child.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const healths = await prisma.skillHealth.findMany({
      where: { childId },
    });
    if (healths.length === 0) return 0.5;

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
    const prevConfidence = historyConfidence[0]?.value ?? 70.0;
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
    const prevRetention = historyRetention[0]?.value ?? 75.0;
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
      const completed = healths.filter((h) => h.masteryScore >= 85.0).length;
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
}

export const analyticsService = new AnalyticsService();
