import { api } from './client';

export function getTodaySession() {
  return api.get('/session/today');
}

export function getSessionHistory(limit = 20) {
  return api.get(`/session/history?limit=${limit}`);
}

export function getSession(id: string) {
  return api.get(`/session/${id}`);
}

export function startSession(id: string) {
  return api.post(`/session/${id}/start`);
}

export function pauseSession(id: string) {
  return api.post(`/session/${id}/pause`);
}

export function resumeSession(id: string) {
  return api.post(`/session/${id}/resume`);
}

export function completeSession(id: string) {
  return api.post(`/session/${id}/complete`);
}

export function completeBlock(sessionId: string, blockId: string) {
  return api.post(`/session/${sessionId}/block/complete`, { blockId });
}

export function skipBlock(sessionId: string, blockId: string) {
  return api.post(`/session/${sessionId}/block/skip`, { blockId });
}
