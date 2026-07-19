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

export interface LearnerAnalyticsSummary {
  readonly childId: string;
  readonly overallCompletionPercentage: number;
  readonly overallMastery: number;
  readonly totalXP: number;
  readonly totalStars: number;
  readonly completedLessons: number;
  readonly completedThemes: number;
}

export interface ProgressTrendPoint {
  readonly date: string;
  readonly cumulativeXP: number;
  readonly cumulativeStars: number;
  readonly completedLessonsCount: number;
  readonly averageMastery: number;
}

export interface LearnerTrends {
  readonly childId: string;
  readonly trends: readonly ProgressTrendPoint[];
}

export interface ClassroomAnalyticsSummary {
  readonly classroomId: string;
  readonly averageCompletionPercentage: number;
  readonly averageMastery: number;
  readonly totalXP: number;
  readonly totalStars: number;
  readonly activeLearnersCount: number;
  readonly learnersCompletionRate: readonly { readonly childId: string; readonly childName: string; readonly percentage: number }[];
  readonly masteryDistribution: readonly { readonly range: string; readonly studentCount: number }[];
}

export interface CurriculumAnalyticsSummary {
  readonly gradeId: string;
  readonly lessonCompletionRate: number;
  readonly themeCompletions: readonly { readonly themeId: string; readonly title: string; readonly completionRate: number }[];
  readonly subjectCompletions: readonly { readonly subject: string; readonly completionRate: number }[];
  readonly averageMasteryByCurriculumLevel: readonly { readonly level: string; readonly averageMastery: number }[];
}

export interface AssessmentAnalyticsSummary {
  readonly assessmentId: string;
  readonly title: string;
  readonly completionRate: number;
  readonly averageScore: number;
  readonly highestScore: number;
  readonly scoreDistribution: readonly { readonly range: string; readonly count: number }[];
  readonly masteryDistribution: readonly { readonly state: string; readonly count: number }[];
}
