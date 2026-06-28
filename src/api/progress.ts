/**
 * Progress API
 *
 * Clean functions for progress overview, completion, and reset.
 */

import { api } from './client';

export function getProgressOverview() {
  return api.get('/progress/overview');
}

export function completeLesson(lessonId: string) {
  return api.post('/progress/complete', { lessonId });
}

export function resetProgress() {
  return api.post('/progress/reset', {});
}
