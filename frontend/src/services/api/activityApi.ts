import { apiClient } from './apiClient';
import type { QuizData, GameData, ReadingContent } from '../../components/activities/types';
import type { ApiResponse } from '../../types/api';

export const activityApi = {
  // --- Video Progress ---
  getVideoProgress: (videoId: string) =>
    apiClient.get<ApiResponse<{ watchPosition: number; isCompleted: boolean }>>(`/video-progress/${videoId}`),

  saveVideoProgress: (videoId: string, watchPosition: number) =>
    apiClient.post<ApiResponse<unknown>>('/video-progress', { videoId, watchPosition }),

  // --- Listen Progress ---
  getListenProgress: (activityId: string) =>
    apiClient.get<ApiResponse<{ isCompleted: boolean; attemptCount: number }>>(`/listen-progress/${activityId}`),

  completeListen: (activityId: string) =>
    apiClient.post<ApiResponse<unknown>>('/listen-progress/complete', { activityId }),

  // --- Speak Progress ---
  getSpeakProgress: (activityId: string) =>
    apiClient.get<ApiResponse<{ isCompleted: boolean; attemptCount: number; bestScore: number; bestStars: number }>>(`/speak-progress/${activityId}`),

  saveSpeakProgress: (activityId: string, score: number) =>
    apiClient.post<ApiResponse<unknown>>('/speak-progress', { activityId, isCompleted: true, score }),

  completeSpeak: (activityId: string, score?: number) =>
    apiClient.post<ApiResponse<unknown>>('/speak-progress/complete', { activityId, score }),

  // --- Write Progress ---
  getWriteProgress: (activityId: string) =>
    apiClient.get<ApiResponse<{ isCompleted: boolean; attemptCount: number; bestScore: number; bestStars: number }>>(`/write-progress/${activityId}`),

  saveWriteProgress: (activityId: string, score: number) =>
    apiClient.post<ApiResponse<unknown>>('/write-progress', { activityId, isCompleted: true, score }),

  completeWrite: (activityId: string, score?: number) =>
    apiClient.post<ApiResponse<unknown>>('/write-progress/complete', { activityId, score }),

  // --- Quiz ---
  getQuiz: (activityId: string) =>
    apiClient.get<ApiResponse<QuizData>>(`/activities/${activityId}/quiz`),

  submitQuiz: (activityId: string, answers: Array<{ questionId: string; answer: string }>) =>
    apiClient.post<ApiResponse<{ score: number; stars: number; totalQuestions: number; correctCount: number; reward?: unknown }>>(`/activities/${activityId}/quiz/submit`, { answers }),

  // --- Game ---
  getGame: (activityId: string) =>
    apiClient.get<ApiResponse<GameData>>(`/activities/${activityId}/game`),

  submitGameScore: (activityId: string, score: number) =>
    apiClient.post<ApiResponse<unknown>>(`/activities/${activityId}/game/complete`, { score }),

  // --- AI Tutor ---
  getAITutorSession: (activityId: string) =>
    apiClient.get<ApiResponse<{ sessionId: string; topic: string }>>(`/activities/${activityId}/ai-tutor`),

  // --- Reading ---
  getReadingContent: (activityId: string) =>
    apiClient.get<ApiResponse<ReadingContent>>(`/activities/${activityId}/reading`),
};
