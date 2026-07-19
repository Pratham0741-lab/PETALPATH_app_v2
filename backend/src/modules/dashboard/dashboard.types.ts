export interface GradeInfo {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface ShortLessonInfo {
  readonly id: string;
  readonly title: string;
}

export interface ProgressOverview {
  readonly completedLessons: number;
  readonly totalLessons: number;
  readonly lessonCompletionPercentage: number;
  readonly completedThemes: number;
  readonly totalThemes: number;
  readonly themeCompletionPercentage: number;
  readonly earnedXP: number;
  readonly earnedStars: number;
}

export interface SubjectProgress {
  readonly subject: string;
  readonly completedLessons: number;
  readonly totalLessons: number;
  readonly percentage: number;
}

export interface ThemeProgressDetail {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly completedLessons: number;
  readonly totalLessons: number;
  readonly percentage: number;
  readonly isCompleted: boolean;
}

export interface LatestAssessmentInfo {
  readonly id: string;
  readonly assessmentId: string;
  readonly title: string;
  readonly score: number;
  readonly maxScore: number;
  readonly percentage: number;
  readonly completedAt: Date;
}

export interface AssessmentSummary {
  readonly completedAssessments: number;
  readonly totalAssessments: number;
  readonly assessmentCompletionPercentage: number;
  readonly latestAssessment: LatestAssessmentInfo | null;
  readonly highestMasteryPercentage: number;
}

export interface SubjectMastery {
  readonly subject: string;
  readonly averageMastery: number;
}

export interface LessonMastery {
  readonly lessonId: string;
  readonly title: string;
  readonly mastery: number;
  readonly state: string;
}

export interface MasterySummary {
  readonly overallMastery: number;
  readonly subjectMastery: readonly SubjectMastery[];
  readonly lessonMastery: readonly LessonMastery[];
}

export interface LearningHistoryEvent {
  readonly type: 'LESSON_COMPLETED' | 'ASSESSMENT_COMPLETED' | 'REWARD_EARNED';
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly detail?: number | string; // e.g. stars, score, points
  readonly timestamp: Date;
}

export interface LearningHistory {
  readonly history: readonly LearningHistoryEvent[];
}

export interface RewardItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly points: number;
  readonly createdAt: Date;
}

export interface AchievementBadge {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imagePath: string | null;
  readonly earnedAt: Date;
}

export interface AchievementSticker {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imagePath: string | null;
  readonly earnedAt: Date;
}

export interface AchievementSummary {
  readonly earnedXP: number;
  readonly earnedStars: number;
  readonly completedLessons: number;
  readonly completedThemes: number;
  readonly completedGrades: number;
  readonly badges: readonly AchievementBadge[];
  readonly stickers: readonly AchievementSticker[];
}

export interface DashboardOverview {
  readonly grade: GradeInfo;
  readonly currentTheme: { readonly id: string; readonly title: string } | null;
  readonly currentLesson: ShortLessonInfo | null;
  readonly progressOverview: ProgressOverview;
  readonly subjectProgress: readonly SubjectProgress[];
  readonly latestAssessment: LatestAssessmentInfo | null;
}
