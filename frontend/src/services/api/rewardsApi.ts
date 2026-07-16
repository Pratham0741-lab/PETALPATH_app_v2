import { apiClient } from './apiClient';
import type { ApiResponse } from '../../types/api';

export interface StickerDTO {
  id: string;
  name: string;
  description: string | null;
  imagePath: string;
  requiredStars: number;
  unlocked: boolean;
  unlockedAt?: string | null;
  iconKey?: string | null;
}

export interface BadgeDTO {
  id: string;
  name: string;
  description: string | null;
  imagePath: string;
  earned: boolean;
  earnedAt?: string | null;
  iconKey?: string | null;
  category?: string | null;
}

export interface RewardsOverviewDTO {
  totalStars: number;
  stickers: Array<StickerDTO & { unlockedAt?: string | null }>;
  badges: Array<BadgeDTO & { earnedAt?: string | null }>;
}

export const rewardsApi = {
  getOverview: () =>
    apiClient.get<ApiResponse<RewardsOverviewDTO>>('/rewards'),

  getStickers: () =>
    apiClient.get<ApiResponse<StickerDTO[]>>('/rewards/stickers'),

  getBadges: () =>
    apiClient.get<ApiResponse<BadgeDTO[]>>('/rewards/badges'),
};
