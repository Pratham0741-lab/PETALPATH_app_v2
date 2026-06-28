/**
 * Children API
 *
 * Clean functions for child profile management.
 */

import { api } from './client';

export function getChildren() {
  return api.get('/children');
}

export function createChild(data: { name: string; age: number; avatarUrl?: string }) {
  return api.post('/children', data);
}

export function updateChild(id: string, data: { name?: string; age?: number; avatarUrl?: string }) {
  return api.put(`/children/${id}`, data);
}

export function deleteChild(id: string) {
  return api.delete(`/children/${id}`);
}
