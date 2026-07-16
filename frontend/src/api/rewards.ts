/**
 * Rewards API
 *
 * Clean functions for rewards, stickers, and badges.
 */

import { api } from './client';

export function getStickers() {
  return api.get('/rewards/stickers');
}

export function getBadges() {
  return api.get('/rewards/badges');
}
