import { prisma } from '../../../config/database.js';
import { AnalyticsMetricType } from '../../../shared/enums.js';

export class AnalyticsHistoryRepository {
  private getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  async upsertDailyMetric(
    childId: string,
    metricType: AnalyticsMetricType,
    value: number,
    date = new Date()
  ) {
    const dayTimestamp = this.getStartOfDay(date);
    return prisma.analyticsHistory.upsert({
      where: {
        childId_metricType_timestamp: {
          childId,
          metricType,
          timestamp: dayTimestamp,
        },
      },
      update: { value },
      create: {
        childId,
        metricType,
        value,
        timestamp: dayTimestamp,
      },
    });
  }

  async findByChild(childId: string, limit = 100) {
    return prisma.analyticsHistory.findMany({
      where: { childId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async findByChildAndMetric(childId: string, metricType: AnalyticsMetricType, limit = 50) {
    return prisma.analyticsHistory.findMany({
      where: { childId, metricType },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async findAggregateInWindow(
    childId: string,
    metricType: AnalyticsMetricType,
    startDate: Date,
    endDate: Date
  ) {
    return prisma.analyticsHistory.findMany({
      where: {
        childId,
        metricType,
        timestamp: {
          gte: this.getStartOfDay(startDate),
          lte: this.getStartOfDay(endDate),
        },
      },
      orderBy: { timestamp: 'asc' },
    });
  }
}

export const analyticsHistoryRepository = new AnalyticsHistoryRepository();
