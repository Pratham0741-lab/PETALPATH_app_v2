import { api } from './client';

export function getCurriculum() {
  return api.get('/curriculum');
}

export function getAvailableSkills() {
  return api.get('/curriculum/available');
}

export function getNextSkills(limit = 3) {
  return api.get(`/curriculum/next?limit=${limit}`);
}

export function getSubjectCurriculum(subjectId: string) {
  return api.get(`/curriculum/subject/${subjectId}`);
}

export function activateSkill(skillId: string) {
  return api.post('/curriculum/activate', { skillId });
}

export function completeSkill(skillId: string) {
  return api.post('/curriculum/complete', { skillId });
}
