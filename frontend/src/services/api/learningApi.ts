import { apiClient } from './apiClient';

export const learningApi = {
  getDashboardOverview: (childId: string) => apiClient.get(`/progress/overview?childId=${childId}`),

  getRoadmap: (childId: string) => apiClient.get(`/roadmap?childId=${childId}`),

  getCurriculum: () => apiClient.get('/curriculum'),

  getLesson: (id: string) => apiClient.get(`/lessons/${id}`),
  getLessonsByModule: (moduleId: string) => apiClient.get(`/lessons?moduleId=${moduleId}`),

  getActivities: (lessonId: string) => apiClient.get(`/activities?lessonId=${lessonId}`),
  getActivity: (id: string) => apiClient.get(`/activities/${id}`),

  getProgressOverview: (childId: string) => apiClient.get(`/progress/overview?childId=${childId}`),
  completeLesson: (lessonId: string) => apiClient.post('/progress/complete', { lessonId }),
  resetProgress: () => apiClient.post('/progress/reset', {}),

  getMastery: (childId: string) => apiClient.get(`/mastery?childId=${childId}`),

  getRecommendation: (childId: string) => apiClient.get(`/v1/learner/${childId}/recommendation`),

  getRewards: (childId: string) => apiClient.get(`/rewards?childId=${childId}`),
  getStickers: (childId: string) => apiClient.get(`/rewards/stickers?childId=${childId}`),
  getBadges: (childId: string) => apiClient.get(`/rewards/badges?childId=${childId}`),
};
