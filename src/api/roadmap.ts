/**
 * Roadmap API
 *
 * Clean functions for roadmap, lessons, and activities.
 */

import { api } from './client';

export function getRoadmap() {
  return api.get('/roadmap');
}

export function getLesson(lessonId: string) {
  return api.get(`/lessons/${lessonId}`);
}

export function getActivities(lessonId: string) {
  return api.get(`/activities?lessonId=${lessonId}`);
}

export function getActivity(activityId: string) {
  return api.get(`/activities/${activityId}`);
}
