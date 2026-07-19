export interface LearnerProgressSummary {
  readonly id: string;
  readonly name: string;
  readonly currentGrade: { readonly id: string; readonly name: string } | null;
  readonly currentTheme: { readonly id: string; readonly title: string } | null;
  readonly currentLesson: { readonly id: string; readonly title: string } | null;
  readonly completionPercentage: number;
  readonly active: boolean;
}

export interface ClassroomOverview {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly totalLearners: number;
  readonly activeLearners: number;
  readonly classroomCompletionPercentage: number;
  readonly learners: readonly LearnerProgressSummary[];
}

export interface ClassroomProgressDetail {
  readonly totalLearners: number;
  readonly activeLearners: number;
  readonly averageCompletedLessons: number;
  readonly averageCompletionPercentage: number;
}

export interface ThemeCompletionStats {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly averageCompletionPercentage: number;
}

export interface SubjectCompletionStats {
  readonly subject: string;
  readonly averageCompletionPercentage: number;
}

export interface LatestAttemptDetail {
  readonly childId: string;
  readonly childName: string;
  readonly assessmentId: string;
  readonly title: string;
  readonly percentage: number;
  readonly completedAt: Date;
}

export interface HighScoreDetail {
  readonly childId: string;
  readonly childName: string;
  readonly score: number;
  readonly maxScore: number;
  readonly percentage: number;
}

export interface AssessmentCompletionRate {
  readonly assessmentId: string;
  readonly title: string;
  readonly completionRatePercentage: number; // percentage of class who completed it
}

export interface ClassroomAssessmentSummary {
  readonly overallAssessmentCompletionPercentage: number;
  readonly classroomAverageScorePercentage: number;
  readonly completionRates: readonly AssessmentCompletionRate[];
  readonly highestScores: readonly HighScoreDetail[];
  readonly latestScores: readonly LatestAttemptDetail[];
}

export interface StudentMasteryStats {
  readonly childId: string;
  readonly childName: string;
  readonly overallMastery: number;
}

export interface SubjectMasteryStats {
  readonly subject: string;
  readonly averageMastery: number;
}

export interface ClassroomMasterySummary {
  readonly overallClassroomMastery: number; // overall average across all students
  readonly subjectMastery: readonly SubjectMasteryStats[];
  readonly studentMastery: readonly StudentMasteryStats[];
}

export interface LearnerAssessmentResult {
  readonly attemptId: string;
  readonly assessmentId: string;
  readonly title: string;
  readonly score: number;
  readonly maxScore: number;
  readonly percentage: number;
  readonly completedAt: Date;
}

export interface ClassroomAchievementsDetail {
  readonly totalXP: number;
  readonly totalStars: number;
  readonly totalBadges: number;
  readonly totalStickers: number;
  readonly totalCompletedLessons: number;
  readonly totalCompletedThemes: number;
  readonly totalCompletedGrades: number;
}
