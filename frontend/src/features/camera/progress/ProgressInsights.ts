import { CameraCompletionMetadata } from './offlineQueue';

export interface RawProgressMetrics {
  totalCompleted: number;
  averageDurationMs: number;
  totalAttempts: number;
  currentStreak: number;
  successRate: number;
}

export interface DerivedInsightsModel {
  strongestSkills: string[];
  needsPractice: string[];
  recommendations: string[];
  recentImprovement: string;
}

export class ProgressInsightsEngine {
  public computeRawMetrics(completions: CameraCompletionMetadata[]): RawProgressMetrics {
    if (!completions || completions.length === 0) {
      return {
        totalCompleted: 0,
        averageDurationMs: 0,
        totalAttempts: 0,
        currentStreak: 0,
        successRate: 0,
      };
    }

    const totalCompleted = completions.filter((c) => c.completed).length;
    const totalDuration = completions.reduce((acc, c) => acc + c.durationMs, 0);
    const totalAttempts = completions.reduce((acc, c) => acc + c.attempts, 0);

    return {
      totalCompleted,
      averageDurationMs: Math.round(totalDuration / Math.max(1, completions.length)),
      totalAttempts,
      currentStreak: totalCompleted,
      successRate: Math.round((totalCompleted / Math.max(1, totalAttempts)) * 100),
    };
  }

  public deriveInsights(completions: CameraCompletionMetadata[]): DerivedInsightsModel {
    const metrics = this.computeRawMetrics(completions);

    const activityCounts: Record<string, number> = {};
    completions.forEach((c) => {
      activityCounts[c.activityType] = (activityCounts[c.activityType] || 0) + 1;
    });

    const sortedActivities = Object.keys(activityCounts).sort(
      (a, b) => activityCounts[b] - activityCounts[a],
    );

    const strongestSkills = sortedActivities.slice(0, 2).map((type) => type.replace('_', ' '));
    const needsPractice = sortedActivities.length > 2 ? [sortedActivities[sortedActivities.length - 1].replace('_', ' ')] : ['wave'];

    return {
      strongestSkills: strongestSkills.length > 0 ? strongestSkills : ['Reach for the Sky'],
      needsPractice: needsPractice,
      recommendations: ['Practice jumping high for 2 minutes today', 'Maintain consistent posture during warmups'],
      recentImprovement: metrics.successRate >= 80 ? 'Excellent coordination progression!' : 'Steady practice in progress!',
    };
  }
}

export const progressInsightsEngine = new ProgressInsightsEngine();
