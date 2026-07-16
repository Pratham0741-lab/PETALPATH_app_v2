import { api } from './client';

export function getCurriculum() {
  return api.get('/curriculum');
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
