import { api } from './client';
import type { ApiResponse } from '../types/api';
import type { Garden } from '../types/garden';
import type { GradeProgress, ProgressStory } from '../types/progress';

export function getCurriculum() {
  return api.get('/curriculum');
}

/**
 * "Your Garden" — the child-facing mastery map. A superset of `getCurriculum`:
 * same subjects and skills, but every flower also carries its live (decayed)
 * mastery, its bloom stage and whether it is thirsty, plus per-patch aggregates.
 * One source for both the panorama and the per-subject drill-in.
 */
export function getGarden() {
  return api.get<ApiResponse<Garden>>('/curriculum/garden');
}

/**
 * "My Story" — the child's progress retold as a cheerful comic. Grade-scoped and
 * computed server-side from the child's own history; the app only draws the beats.
 */
export function getProgressStory() {
  return api.get<ApiResponse<ProgressStory>>('/curriculum/story');
}

/**
 * The parent-locked analysis behind Explore: accuracy by subject, mastery over
 * time and before/after, all restricted to the child's grade. Ownership is
 * resolved from the active child on the token, like the garden.
 */
export function getGradeProgress() {
  return api.get<ApiResponse<GradeProgress>>('/analytics/grade-progress');
}

export function getAvailableSkills() {
  return api.get('/curriculum/available');
}

export function getSubjectCurriculum(subjectId: string) {
  return api.get(`/curriculum/subject/${subjectId}`);
}

export function activateSkill(skillId: string) {
  return api.post('/curriculum/activate', { skillId });
}
