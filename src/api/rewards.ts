/**
 * Rewards API
 *
 * Clean functions for rewards, stickers, and badges.
 */

import { api } from './client';

export function getRewardsOverview() {
  return api.get('/rewards');
}

export function getStickers() {
  return api.get('/rewards/stickers');
}

export function getBadges() {
  return api.get('/rewards/badges');
}
