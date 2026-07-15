import { api } from './client';

export function getAssessments() {
  return api.get('/assessments');
}

export function getAssessment(id: string) {
  return api.get(`/assessments/${id}`);
}

export function createAttempt(childId: string, assessmentId: string) {
  return api.post(`/assessments/${childId}/attempts`, { assessmentId });
}

export function getAttempts(childId: string, assessmentId?: string) {
  const params = assessmentId ? `?assessmentId=${assessmentId}` : '';
  return api.get(`/assessments/${childId}/attempts${params}`);
}

export function getAttempt(childId: string, attemptId: string) {
  return api.get(`/assessments/${childId}/attempts/${attemptId}`);
}

export function submitAttempt(childId: string, attemptId: string, responses: Array<{ questionId: string; answer: string }>) {
  return api.post(`/assessments/${childId}/attempts/${attemptId}/submit`, { responses });
}
