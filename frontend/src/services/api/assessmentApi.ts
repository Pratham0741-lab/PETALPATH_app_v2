import { apiClient } from './apiClient';
import type { ApiResponse } from '../../types/api';

export interface Assessment {
  id: string;
  title: string;
  description?: string | null;
  ageGroup?: string | null;
  estimatedMinutes: number;
  thumbnail?: string | null;
  isActive: boolean;
  questions?: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  prompt: string;
  questionType: 'MULTIPLE_CHOICE' | 'BOOLEAN' | 'SCALE' | 'TEXT' | 'MULTI_SELECT' | 'ORDERING' | 'MATCHING' | 'FILL_BLANK';
  options?: Array<{ label: string; value: string }> | null;
  order: number;
  maxScore: number;
  correctAnswer?: string | null;
}

export interface AssessmentAttempt {
  id: string;
  childId: string;
  assessmentId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt?: string | null;
  rawResponses?: Array<{ questionId: string; answer: string }> | null;
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  assessment?: Assessment;
}

export interface SubmitResponse {
  questionId: string;
  answer: string;
}

export interface PlacementQuestionnaire {
  assessmentId: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  totalQuestions: number;
  questions: Array<{
    id: string;
    prompt: string;
    questionType: string;
    config?: { skillId?: string; choices?: Array<{ label: string; value: string }> };
    order: number;
    maxScore: number;
  }>;
}

export interface PlacementProgress {
  attemptId: string;
  totalQuestions: number;
  answeredCount: number;
  currentQuestion: number;
  isComplete: boolean;
}

export interface PlacementResult {
  assessmentId: string;
  title: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  skillResults: Array<{
    skillId: string;
    skillName: string;
    correctCount: number;
    totalCount: number;
    accuracy: number;
    mastery: string;
  }>;
  startingSkill?: { id: string; name: string };
  hasPrerequisiteGaps: boolean;
  prerequisiteGaps: Array<{ skillId: string; skillName: string; dependentOn: string[] }>;
  curriculumGenerated: boolean;
  roadmapGenerated: boolean;
}

export const assessmentApi = {
  // --- Assessments ---
  listAssessments: () =>
    apiClient.get<ApiResponse<Assessment[]>>('/assessments'),

  getAssessment: (id: string) =>
    apiClient.get<ApiResponse<Assessment>>(`/assessments/${id}`),

  // --- Attempts ---
  createAttempt: (childId: string, assessmentId: string) =>
    apiClient.post<ApiResponse<AssessmentAttempt>>(`/assessments/${childId}/attempts`, { assessmentId }),

  getAttempts: (childId: string, assessmentId?: string) => {
    const params = assessmentId ? `?assessmentId=${assessmentId}` : '';
    return apiClient.get<ApiResponse<AssessmentAttempt[]>>(`/assessments/${childId}/attempts${params}`);
  },

  getAttempt: (childId: string, attemptId: string) =>
    apiClient.get<ApiResponse<AssessmentAttempt>>(`/assessments/${childId}/attempts/${attemptId}`),

  submitAttempt: (childId: string, attemptId: string, responses: SubmitResponse[]) =>
    apiClient.post<ApiResponse<AssessmentAttempt>>(`/assessments/${childId}/attempts/${attemptId}/submit`, { responses }),

  // --- Placement ---
  getPlacementQuestionnaire: (ageGroup?: string, startFromBeginning?: boolean) => {
    const params = new URLSearchParams();
    if (ageGroup) params.set('ageGroup', ageGroup);
    if (startFromBeginning) params.set('startFromBeginning', 'true');
    const qs = params.toString();
    return apiClient.get<ApiResponse<PlacementQuestionnaire>>(`/placement/questionnaire${qs ? `?${qs}` : ''}`);
  },

  startPlacement: (childId: string, assessmentId: string) =>
    apiClient.post<ApiResponse<PlacementProgress>>('/placement/start', { childId, assessmentId }),

  startPlacementFromBeginning: (childId: string) =>
    apiClient.post<ApiResponse<PlacementProgress>>('/placement/start-from-beginning', { childId }),

  submitPlacementAnswer: (childId: string, attemptId: string, questionId: string, answer: string) =>
    apiClient.post<ApiResponse<PlacementProgress>>(`/placement/children/${childId}/answer`, { attemptId, questionId, answer }),

  completePlacement: (childId: string, attemptId: string) =>
    apiClient.post<ApiResponse<PlacementResult>>(`/placement/children/${childId}/complete`, { attemptId }),

  getPlacementResult: (childId: string, attemptId: string) =>
    apiClient.get<ApiResponse<PlacementResult>>(`/placement/children/${childId}/result/${attemptId}`),

  restartPlacement: (childId: string) =>
    apiClient.post<ApiResponse<{ success: boolean }>>(`/placement/children/${childId}/restart`, {}),
};
