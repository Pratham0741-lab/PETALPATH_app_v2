/**
 * Mentors API
 *
 * Clean functions for mentor listing.
 */

import { api } from './client';

export function getMentors() {
  return api.get('/mentors');
}
