import { logger } from '../../utils/logger.js';

type CounterKey =
  | 'request.total'
  | 'request.error'
  | 'auth.login'
  | 'auth.register'
  | 'session.generated'
  | 'session.started'
  | 'session.completed'
  | 'lesson.completed'
  | 'assessment.completed'
  | 'story.completed'
  | 'notification.sent'
  | 'reward.unlocked';

class MetricsService {
  private counters = new Map<CounterKey, number>();
  private responseTimes: number[] = [];
  private activeUsers = new Set<string>();
  private startTime = Date.now();

  increment(key: CounterKey): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  recordResponseTime(ms: number): void {
    this.responseTimes.push(ms);
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(-5000);
    }
  }

  trackActiveUser(userId: string): void {
    this.activeUsers.add(userId);
  }

  getSnapshot() {
    const totalRequests = this.counters.get('request.total') ?? 0;
    const totalErrors = this.counters.get('request.error') ?? 0;
    const avgResponseTime = this.responseTimes.length > 0
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0;

    return {
      counters: Object.fromEntries(this.counters),
      activeUsers: this.activeUsers.size,
      averageResponseTimeMs: avgResponseTime,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  reset(): void {
    this.counters.clear();
    this.responseTimes = [];
    this.activeUsers.clear();
    this.startTime = Date.now();
  }

  logPeriodicSummary(): void {
    const snapshot = this.getSnapshot();
    logger.info(snapshot, 'metrics summary');
  }
}

export const metricsService = new MetricsService();
