import { MetricSnapshot } from '../../domain/entities/metric-snapshot.entity.js';
import { MetricCategory } from '../../domain/value-objects/intelligence-types.js';
import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningEvidence } from '../../../adaptive-learning/domain/entities/learning-evidence.entity.js';
import { IMetricSnapshotRepository } from '../../domain/repositories/repository-interfaces.js';
import { LearningEventType, Modality, EvidenceType } from '../../../adaptive-learning/domain/value-objects/event-types.js';

interface AggregatedMetrics {
  performance: {
    avgAccuracy: number;
    avgAttempts: number;
    avgRetries: number;
    completionRate: number;
    successRate: number;
  };
  modality: Record<string, {
    avgAccuracy: number;
    avgAttempts: number;
    avgRetries: number;
    completionRate: number;
    totalEvents: number;
  }>;
  topic: Record<string, {
    completionRate: number;
    avgAccuracy: number;
    avgDuration: number;
    eventCount: number;
  }>;
  session: {
    avgDuration: number;
    avgEventsPerSession: number;
    completionRate: number;
    totalSessions: number;
  };
  retention: {
    reviewSuccessRate: number;
    avgDaysSinceLastReview: number;
    forgettingIndicator: number;
  };
}

export class EvidenceProcessor {
  constructor(
    private readonly metricSnapshotRepo?: IMetricSnapshotRepository,
  ) {}

  async processEvidence(
    childId: string,
    events: LearningEvent[],
    evidence: LearningEvidence[]
  ): Promise<MetricSnapshot[]> {
    const snapshots: MetricSnapshot[] = [];

    // Process performance metrics
    const performanceSnapshot = this.calculatePerformanceMetrics(childId, events, evidence);
    snapshots.push(performanceSnapshot);

    // Process modality metrics
    const modalitySnapshots = this.calculateModalityMetrics(childId, events, evidence);
    snapshots.push(...modalitySnapshots);

    // Process topic metrics
    const topicSnapshots = this.calculateTopicMetrics(childId, events, evidence);
    snapshots.push(...topicSnapshots);

    // Process session metrics
    const sessionSnapshot = this.calculateSessionMetrics(childId, events);
    snapshots.push(sessionSnapshot);

    // Process retention metrics
    const retentionSnapshot = this.calculateRetentionMetrics(childId, events, evidence);
    snapshots.push(retentionSnapshot);

    // Persist all snapshots
    if (this.metricSnapshotRepo) {
      for (const snapshot of snapshots) {
        await this.metricSnapshotRepo.create(snapshot);
      }
    }

    return snapshots;
  }

  private calculatePerformanceMetrics(
    childId: string,
    events: LearningEvent[],
    evidence: LearningEvidence[]
  ): MetricSnapshot {
    const completedEvents = events.filter(e => 
      e.eventType === LearningEventType.ACTIVITY_COMPLETED
    );
    const accuracyValues = completedEvents
      .map(e => e.payload?.accuracy as number)
      .filter(v => typeof v === 'number');

    const avgAccuracy = accuracyValues.length > 0
      ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length
      : 0;

    const attempts = completedEvents
      .map(e => e.payload?.attempts as number)
      .filter(v => typeof v === 'number');
    const avgAttempts = attempts.length > 0
      ? attempts.reduce((a, b) => a + b, 0) / attempts.length
      : 0;

    const retries = completedEvents
      .map(e => e.payload?.retries as number)
      .filter(v => typeof v === 'number');
    const avgRetries = retries.length > 0
      ? retries.reduce((a, b) => a + b, 0) / retries.length
      : 0;

    const totalActivities = events.filter(e =>
      e.eventType === LearningEventType.ACTIVITY_STARTED ||
      e.eventType === LearningEventType.ACTIVITY_COMPLETED
    ).length;
    const completedActivities = completedEvents.length;
    const completionRate = totalActivities > 0 ? completedActivities / totalActivities : 0;

    const successEvents = completedEvents.filter(e =>
      (e.payload?.accuracy as number) >= 70
    ).length;
    const successRate = completedActivities > 0 ? successEvents / completedActivities : 0;

    const now = new Date();
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    return MetricSnapshot.create({
      childId,
      category: MetricCategory.PERFORMANCE,
      metrics: {
        avgAccuracy,
        avgAttempts,
        avgRetries,
        completionRate,
        successRate,
        totalEvents: events.length,
      },
      calculationVersion: '1.0',
      windowStart,
      windowEnd: now,
    });
  }

  private calculateModalityMetrics(
    childId: string,
    events: LearningEvent[],
    evidence: LearningEvidence[]
  ): MetricSnapshot[] {
    const modalityEvents = new Map<string, LearningEvent[]>();
    
    for (const event of events) {
      const modality = event.modality || 'VIDEO';
      if (!modalityEvents.has(modality)) {
        modalityEvents.set(modality, []);
      }
      modalityEvents.get(modality)!.push(event);
    }

    const snapshots: MetricSnapshot[] = [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const [modality, modalityEventList] of modalityEvents) {
      const completedEvents = modalityEventList.filter(e => 
        e.eventType === LearningEventType.ACTIVITY_COMPLETED
      );

      const accuracyValues = completedEvents
        .map(e => e.payload?.accuracy as number)
        .filter(v => typeof v === 'number');
      const avgAccuracy = accuracyValues.length > 0
        ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length
        : 0;

      const attempts = completedEvents
        .map(e => e.payload?.attempts as number)
        .filter(v => typeof v === 'number');
      const avgAttempts = attempts.length > 0
        ? attempts.reduce((a, b) => a + b, 0) / attempts.length
        : 0;

      const retries = completedEvents
        .map(e => e.payload?.retries as number)
        .filter(v => typeof v === 'number');
      const avgRetries = retries.length > 0
        ? retries.reduce((a, b) => a + b, 0) / retries.length
        : 0;

      const totalActivities = modalityEventList.filter(e =>
        e.eventType === LearningEventType.ACTIVITY_STARTED ||
        e.eventType === LearningEventType.ACTIVITY_COMPLETED
      ).length;
      const completedActivities = completedEvents.length;
      const completionRate = totalActivities > 0 ? completedActivities / totalActivities : 0;

      snapshots.push(MetricSnapshot.create({
        childId,
        category: MetricCategory.MODALITY,
        metrics: {
          modality,
          avgAccuracy,
          avgAttempts,
          avgRetries,
          completionRate,
          totalEvents: modalityEventList.length,
        },
        calculationVersion: '1.0',
        windowStart,
        windowEnd: now,
      }));
    }

    return snapshots;
  }

  private calculateTopicMetrics(
    childId: string,
    events: LearningEvent[],
    evidence: LearningEvidence[]
  ): MetricSnapshot[] {
    const topicEvents = new Map<string, LearningEvent[]>();
    
    for (const event of events) {
      if (event.topicId) {
        if (!topicEvents.has(event.topicId)) {
          topicEvents.set(event.topicId, []);
        }
        topicEvents.get(event.topicId)!.push(event);
      }
    }

    const snapshots: MetricSnapshot[] = [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const [topicId, topicEventList] of topicEvents) {
      const completedEvents = topicEventList.filter(e => 
        e.eventType === LearningEventType.ACTIVITY_COMPLETED
      );

      const accuracyValues = completedEvents
        .map(e => e.payload?.accuracy as number)
        .filter(v => typeof v === 'number');
      const avgAccuracy = accuracyValues.length > 0
        ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length
        : 0;

      const durationValues = completedEvents
        .map(e => e.duration as number)
        .filter(v => typeof v === 'number');
      const avgDuration = durationValues.length > 0
        ? durationValues.reduce((a, b) => a + b, 0) / durationValues.length
        : 0;

      const totalActivities = topicEventList.filter(e =>
        e.eventType === LearningEventType.ACTIVITY_STARTED ||
        e.eventType === LearningEventType.ACTIVITY_COMPLETED
      ).length;
      const completedActivities = completedEvents.length;
      const completionRate = totalActivities > 0 ? completedActivities / totalActivities : 0;

      snapshots.push(MetricSnapshot.create({
        childId,
        category: MetricCategory.TOPIC,
        metrics: {
          topicId,
          avgAccuracy,
          avgDuration,
          completionRate,
          eventCount: topicEventList.length,
        },
        calculationVersion: '1.0',
        windowStart,
        windowEnd: now,
      }));
    }

    return snapshots;
  }

  private calculateSessionMetrics(
    childId: string,
    events: LearningEvent[]
  ): MetricSnapshot {
    const sessionEvents = new Map<string, LearningEvent[]>();
    
    for (const event of events) {
      if (event.sessionId) {
        if (!sessionEvents.has(event.sessionId)) {
          sessionEvents.set(event.sessionId, []);
        }
        sessionEvents.get(event.sessionId)!.push(event);
      }
    }

    let totalDuration = 0;
    let totalEvents = 0;
    let completedSessions = 0;

    for (const [, sessionEventList] of sessionEvents) {
      const sessionStart = sessionEventList.find(e => 
        e.eventType === LearningEventType.SESSION_STARTED
      );
      const sessionEnd = sessionEventList.find(e => 
        e.eventType === LearningEventType.SESSION_COMPLETED
      );
      
      if (sessionStart && sessionEnd) {
        const duration = sessionEnd.timestamp.getTime() - sessionStart.timestamp.getTime();
        totalDuration += duration;
        completedSessions++;
      }
      totalEvents += sessionEventList.length;
    }

    const avgDuration = completedSessions > 0 ? totalDuration / completedSessions : 0;
    const avgEventsPerSession = sessionEvents.size > 0 ? totalEvents / sessionEvents.size : 0;
    const completionRate = sessionEvents.size > 0 ? completedSessions / sessionEvents.size : 0;

    const now = new Date();
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return MetricSnapshot.create({
      childId,
      category: MetricCategory.SESSION,
      metrics: {
        avgDuration,
        avgEventsPerSession,
        completionRate,
        totalSessions: sessionEvents.size,
      },
      calculationVersion: '1.0',
      windowStart,
      windowEnd: now,
    });
  }

  private calculateRetentionMetrics(
    childId: string,
    events: LearningEvent[],
    evidence: LearningEvidence[]
  ): MetricSnapshot {
    const reviewEvents = events.filter(e => 
      e.eventType === LearningEventType.REINFORCEMENT_COMPLETED ||
      e.eventType === LearningEventType.DAILY_PRACTICE_COMPLETED
    );

    const successfulReviews = reviewEvents.filter(e => 
      (e.payload?.accuracy as number) >= 70
    ).length;

    const reviewSuccessRate = reviewEvents.length > 0 
      ? successfulReviews / reviewEvents.length 
      : 0;

    // Calculate days since last review for each topic
    const topicLastReview = new Map<string, Date>();
    for (const event of reviewEvents) {
      if (event.topicId) {
        const existing = topicLastReview.get(event.topicId);
        if (!existing || event.timestamp > existing) {
          topicLastReview.set(event.topicId, event.timestamp);
        }
      }
    }

    const now = new Date();
    const daysSinceLastReview = Array.from(topicLastReview.values()).map(lastReview => 
      (now.getTime() - lastReview.getTime()) / (24 * 60 * 60 * 1000)
    );

    const avgDaysSinceLastReview = daysSinceLastReview.length > 0
      ? daysSinceLastReview.reduce((a, b) => a + b, 0) / daysSinceLastReview.length
      : 30;

    // Forgetting indicator: topics not reviewed in > 14 days with previous success
    const forgettingTopics = daysSinceLastReview.filter(d => d > 14).length;
    const forgettingIndicator = topicLastReview.size > 0 
      ? forgettingTopics / topicLastReview.size 
      : 0;

    const nowDate = new Date();
    const windowStart = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    return MetricSnapshot.create({
      childId,
      category: MetricCategory.RETENTION,
      metrics: {
        reviewSuccessRate,
        avgDaysSinceLastReview,
        forgettingIndicator,
        topicsTracked: topicLastReview.size,
      },
      calculationVersion: '1.0',
      windowStart,
      windowEnd: nowDate,
    });
  }
}