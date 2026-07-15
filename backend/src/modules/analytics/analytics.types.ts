export type ActivityPeriod = 'daily' | 'weekly' | 'monthly';

export interface OverviewMetrics {
  lessonsCompleted: number;
  lessonsStarted: number;
  completionPercentage: number;
  assessmentsCompleted: number;
  averageAssessmentScore: number;
  totalStars: number;
  totalBadges: number;
  totalStickers: number;
  totalLearningMinutes: number;
}

export interface ActivityBucket {
  key: string;
  label: string;
  lessonCompletions: number;
  assessmentCompletions: number;
  rewards: number;
  total: number;
}

export interface ActivitySeries {
  period: ActivityPeriod;
  buckets: ActivityBucket[];
}

export interface LessonCompletionPoint {
  date: string;
  count: number;
  cumulative: number;
}

export interface ProgressSummary {
  lessonTrend: LessonCompletionPoint[];
  modules: { completed: number; total: number };
  categories: { completed: number; total: number };
  assessments: { completed: number; averageScore: number };
}

export interface RewardsSummary {
  stars: number;
  badges: { total: number; items: Array<{ id: string; name: string }> };
  stickers: { total: number; items: Array<{ id: string; name: string }> };
  recentRewards: Array<{ id: string; title: string; points: number; earnedAt: string }>;
}

export type TimelineItemType =
  | 'LESSON_COMPLETED'
  | 'ASSESSMENT_COMPLETED'
  | 'REWARD_EARNED'
  | 'VIDEO_WATCHED';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface TimelineResult {
  data: TimelineItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
