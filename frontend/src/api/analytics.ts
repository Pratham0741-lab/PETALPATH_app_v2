import { api } from './client';

export function getAnalyticsOverview(childId?: string) {
  const params = childId ? `?childId=${childId}` : '';
  return api.get(`/analytics/overview${params}`);
}

export function getAnalyticsActivity(period: 'daily' | 'weekly' | 'monthly', childId?: string) {
  let params = `?period=${period}`;
  if (childId) params += `&childId=${childId}`;
  return api.get(`/analytics/activity${params}`);
}

export function getAnalyticsProgress(childId?: string) {
  const params = childId ? `?childId=${childId}` : '';
  return api.get(`/analytics/progress${params}`);
}

export function getAnalyticsRewards(childId?: string) {
  const params = childId ? `?childId=${childId}` : '';
  return api.get(`/analytics/rewards${params}`);
}

export function getAnalyticsTimeline(page = 1, limit = 20, childId?: string) {
  let params = `?page=${page}&limit=${limit}`;
  if (childId) params += `&childId=${childId}`;
  return api.get(`/analytics/timeline${params}`);
}

export function getAnalyticsSubjects() {
  return api.get('/analytics/subjects');
}
