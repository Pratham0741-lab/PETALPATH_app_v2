import { apiClient } from './apiClient';
import type { ApiResponse } from '../../types/api';

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
  period: 'daily' | 'weekly' | 'monthly';
  buckets: ActivityBucket[];
}

export interface ProgressSummary {
  lessonTrend: Array<{ date: string; count: number; cumulative: number }>;
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

export interface TimelineEvent {
  id: string;
  type: 'LESSON_COMPLETED' | 'ASSESSMENT_COMPLETED' | 'REWARD_EARNED' | 'VIDEO_WATCHED';
  title: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface TimelineResult {
  data: TimelineEvent[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface SubjectPerformance {
  subject: string;
  accuracy: number;
  confidence: number;
  retention: number;
  lessonsCompleted: number;
  masteryScore: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalLearningMinutes: number;
  lessonsCompleted: number;
  activitiesCompleted: number;
  modulesCompleted: number;
  skillsImproved: number;
  weakSkills: Array<{ name: string; score: number }>;
  trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
}

export interface MonthlyReport {
  month: string;
  totalLearningMinutes: number;
  lessonsCompleted: number;
  curriculumProgress: number;
  masteryGrowth: number;
  consistency: number;
  contentCompleted: { lessons: number; modules: number; activities: number };
  previousMonthComparison: { lessonsChange: number; minutesChange: number; masteryChange: number };
  achievements: string[];
  recommendations: string[];
}

export interface CurriculumInsight {
  currentCurriculum: string;
  modulesCompleted: number;
  modulesRemaining: number;
  lessonsCompleted: number;
  lessonsRemaining: number;
  averageLessonCompletion: number;
  estimatedCompletionDays: number;
  curriculumHealth: 'good' | 'needs_attention' | 'behind';
  nextMilestones: Array<{ title: string; type: 'module' | 'category'; etaDays: number }>;
  roadmapCompletion: number;
}

export interface LearningStats {
  dailyMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
  dailyLessons: number;
  weeklyLessons: number;
  monthlyLessons: number;
  averageSessionMinutes: number;
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
  learningVelocity: number;
}

export const analyticsApi = {
  getOverview: (childId: string) =>
    apiClient.get<ApiResponse<OverviewMetrics>>(`/analytics/overview?childId=${childId}`),

  getActivity: (childId: string, period: 'daily' | 'weekly' | 'monthly') =>
    apiClient.get<ApiResponse<ActivitySeries>>(`/analytics/activity?period=${period}&childId=${childId}`),

  getProgress: (childId: string) =>
    apiClient.get<ApiResponse<ProgressSummary>>(`/analytics/progress?childId=${childId}`),

  getRewards: (childId: string) =>
    apiClient.get<ApiResponse<RewardsSummary>>(`/analytics/rewards?childId=${childId}`),

  getTimeline: (childId: string, page: number = 1, limit: number = 20) =>
    apiClient.get<ApiResponse<TimelineResult>>(`/analytics/timeline?page=${page}&limit=${limit}&childId=${childId}`),

  getSubjects: (childId: string) =>
    apiClient.get<ApiResponse<SubjectPerformance[]>>(`/analytics/subjects?childId=${childId}`),

  getReport: (childId: string, window: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'LIFETIME') =>
    apiClient.get<ApiResponse<unknown>>(`/analytics/report?window=${window}&childId=${childId}`),

  getDashboardSummary: (childId: string) =>
    apiClient.get<ApiResponse<OverviewMetrics & LearningStats>>(`/progress/overview?childId=${childId}`),

  getCurriculumInsights: (childId: string) =>
    apiClient.get<ApiResponse<CurriculumInsight>>(`/analytics/progress?childId=${childId}`),

  getWeeklyReport: (childId: string) =>
    apiClient.get<ApiResponse<WeeklyReport>>(`/analytics/report?window=WEEKLY&childId=${childId}`),

  getMonthlyReport: (childId: string) =>
    apiClient.get<ApiResponse<MonthlyReport>>(`/analytics/report?window=MONTHLY&childId=${childId}`),

  getLearningHistory: (childId: string, page: number = 1, limit: number = 20) =>
    apiClient.get<ApiResponse<TimelineResult>>(`/analytics/timeline?page=${page}&limit=${limit}&childId=${childId}`),

  getLearningTrends: (childId: string) =>
    apiClient.get<ApiResponse<{ trends: Array<{ period: string; completions: number; minutes: number }> }>>(`/analytics/trends?childId=${childId}`),

  getCompletionRate: (childId: string) =>
    apiClient.get<ApiResponse<{ rate: number; trend: 'up' | 'down' | 'stable'; change: number }>>(`/analytics/progress?childId=${childId}`),

  getLearningTime: (childId: string) =>
    apiClient.get<ApiResponse<LearningStats>>(`/analytics/overview?childId=${childId}`),

  getSkillMasteryDetailed: (childId: string) =>
    apiClient.get<ApiResponse<Array<{ category: string; skills: Array<{ name: string; score: number; state: string }> }>>>(
      `/mastery/child/${childId}`,
    ),
};
