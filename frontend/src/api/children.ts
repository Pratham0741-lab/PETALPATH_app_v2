/**
 * Children API
 *
 * Clean functions for child profile management.
 */

import { api } from './client';

export function updateChild(id: string, data: { name?: string; age?: number; avatarUrl?: string }) {
  return api.put(`/children/${id}`, data);
}

export function deleteChild(id: string) {
  return api.delete(`/children/${id}`);
}
