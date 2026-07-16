import { apiClient } from './apiClient';
import type { ApiResponse } from '../../types/api';

export interface AdaptiveProfile {
  childId: string;
  learningSpeed: number;
  preferredModality: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  engagement: number;
  confidence: number;
  difficulty: number;
  consistency: number;
  focus: number;
  momentum: number;
  trend: 'improving' | 'declining' | 'stable';
  personalizationFactors: Array<{ factor: string; value: number }>;
}

export interface ReinforcementItem {
  id: string;
  skillId: string;
  skillName: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'due_now' | 'due_soon' | 'completed' | 'snoozed';
  lastReinforced: string | null;
  strengthBefore: number;
}

export interface AITutorSession {
  id: string;
  childId: string;
  topic: string;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt: string | null;
  messages: Array<{
    id: string;
    role: 'ai' | 'child';
    content: string;
    timestamp: string;
  }>;
  masteryGained: number;
  duration: number;
}

export interface MasteryData {
  childId: string;
  skillId: string;
  skillName: string;
  domain: string;
  subject: string;
  masteryScore: number;
  masteryState: 'locked' | 'in_progress' | 'mastered' | 'review';
  confidence: number;
  lastAssessed: string | null;
  dependencies: string[];
}

export interface AdaptiveRecommendation {
  kind: 'continue' | 'skill' | 'daily_challenge' | 'reinforcement' | 'ai_tutor' | 'curriculum';
  skillId?: string;
  skillName?: string;
  activityType?: string;
  title: string;
  reason: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

export interface WeakSkill {
  skillId: string;
  skillName: string;
  domain: string;
  masteryScore: number;
  threshold: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
}

export interface LearningEvent {
  id: string;
  childId: string;
  sessionId?: string;
  activityId?: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface SessionBlock {
  id: string;
  skillId: string;
  skillName: string;
  activityType: string;
  duration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export interface LearningSession {
  id: string;
  childId: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'abandoned';
  startedAt: string | null;
  blocks: SessionBlock[];
  totalDuration: number;
  elapsedDuration: number;
}

export const intelligenceApi = {
  // --- AI Tutor ---
  createAITutorSession: (topic: string) =>
    apiClient.post<ApiResponse<AITutorSession>>('/ai-tutor/session', { topic }),

  getAITutorSessions: (childId: string) =>
    apiClient.get<ApiResponse<AITutorSession[]>>(`/learner/${childId}/sessions?type=ai_tutor`),

  getAITutorSession: (sessionId: string) =>
    apiClient.get<ApiResponse<AITutorSession>>(`/ai-tutor/session/${sessionId}`),

  sendAITutorMessage: (sessionId: string, message: string) =>
    apiClient.post<ApiResponse<{ reply: string; session: AITutorSession }>>(`/ai-tutor/session/${sessionId}/message`, { message }),

  completeAITutorSession: (sessionId: string) =>
    apiClient.post<ApiResponse<{ masteryGained: number; recommendation?: AdaptiveRecommendation }>>(`/ai-tutor/session/${sessionId}/complete`, {}),

  // --- Adaptive Profile ---
  getAdaptiveProfile: (childId: string) =>
    apiClient.get<ApiResponse<AdaptiveProfile>>(`/adaptive/profile?childId=${childId}`),

  getModalityPerformance: (childId: string) =>
    apiClient.get<ApiResponse<Record<string, number>>>(`/adaptive/modality?childId=${childId}`),

  // --- Recommendations ---
  getAdaptiveRecommendations: (childId: string) =>
    apiClient.get<ApiResponse<AdaptiveRecommendation[]>>(`/adaptive/recommendations?childId=${childId}`),

  // --- Reinforcement ---
  getReinforcementQueue: (childId: string) =>
    apiClient.get<ApiResponse<ReinforcementItem[]>>(`/reinforcement/queue?childId=${childId}`),

  getReinforcementDue: (childId: string) =>
    apiClient.get<ApiResponse<ReinforcementItem[]>>(`/reinforcement/due?childId=${childId}`),

  getReinforcementHistory: (childId: string) =>
    apiClient.get<ApiResponse<ReinforcementItem[]>>(`/reinforcement/history?childId=${childId}`),

  startReinforcement: (itemId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/reinforcement/queue/${itemId}/start`, {}),

  skipReinforcement: (itemId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/reinforcement/queue/${itemId}/skip`, {}),

  completeReinforcement: (itemId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/reinforcement/queue/${itemId}/complete`, {}),

  // --- Mastery ---
  getMasteryDetail: (childId: string) =>
    apiClient.get<ApiResponse<MasteryData[]>>(`/mastery/child/${childId}`),

  getWeakSkills: (childId: string) =>
    apiClient.get<ApiResponse<WeakSkill[]>>(`/mastery/weak-skills?childId=${childId}`),

  getSkillMastery: (skillId: string) =>
    apiClient.get<ApiResponse<MasteryData>>(`/mastery/${skillId}`),

  // --- Learning Events ---
  createLearningEvent: (event: Omit<LearningEvent, 'id' | 'timestamp'>) =>
    apiClient.post<ApiResponse<LearningEvent>>('/v1/learning-events', event),

  // --- Sessions ---
  createSession: () =>
    apiClient.post<ApiResponse<LearningSession>>('/session/create', {}),

  getTodaySessions: (childId: string) =>
    apiClient.get<ApiResponse<LearningSession[]>>(`/session/today?childId=${childId}`),

  getSessionHistory: (childId: string) =>
    apiClient.get<ApiResponse<LearningSession[]>>(`/session/history?childId=${childId}`),

  getSession: (sessionId: string) =>
    apiClient.get<ApiResponse<LearningSession>>(`/session/${sessionId}`),

  startSession: (sessionId: string) =>
    apiClient.post<ApiResponse<LearningSession>>(`/session/${sessionId}/start`, {}),

  pauseSession: (sessionId: string) =>
    apiClient.post<ApiResponse<LearningSession>>(`/session/${sessionId}/pause`, {}),

  resumeSession: (sessionId: string) =>
    apiClient.post<ApiResponse<LearningSession>>(`/session/${sessionId}/resume`, {}),

  completeSession: (sessionId: string) =>
    apiClient.post<ApiResponse<{ recommendation?: AdaptiveRecommendation }>>(`/session/${sessionId}/complete`, {}),

  completeSessionBlock: (sessionId: string, blockId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/session/${sessionId}/block/complete`, { blockId }),

  skipSessionBlock: (sessionId: string, blockId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/session/${sessionId}/block/skip`, { blockId }),
};
