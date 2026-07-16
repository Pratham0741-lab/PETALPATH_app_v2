import { api } from './client';

export function getStories(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return api.get(`/stories${qs ? `?${qs}` : ''}`);
}

export function getStory(id: string) {
  return api.get(`/stories/${id}`);
}

export function startStory(id: string) {
  return api.post(`/stories/${id}/start`);
}

export function updateStoryPage(id: string, pageNumber: number, readingTime?: number) {
  return api.post(`/stories/${id}/page`, { pageNumber, readingTime });
}

export function completeStory(id: string, readingTime: number) {
  return api.post(`/stories/${id}/complete`, { readingTime });
}

export function getStoryProgress(storyId: string) {
  return api.get(`/stories/${storyId}/progress`);
}
