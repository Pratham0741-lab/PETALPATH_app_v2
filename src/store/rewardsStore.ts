import { create } from 'zustand';
import { api } from '../utils/api';

export interface Sticker {
  id: string;
  name: string;
  description: string | null;
  imagePath: string;
  requiredStars: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  imagePath: string;
  earned: boolean;
  earnedAt?: string;
}

interface RewardsState {
  totalStars: number;
  stickers: Sticker[];
  badges: Badge[];
  loading: boolean;
  error: string | null;

  refreshRewards: () => Promise<void>;
}

export const useRewardsStore = create<RewardsState>((set) => ({
  totalStars: 0,
  stickers: [],
  badges: [],
  loading: false,
  error: null,

  refreshRewards: async () => {
    set({ loading: true, error: null });
    try {
      const resOverview = await api.get('/rewards');
      const resStickers = await api.get('/rewards/stickers');
      const resBadges = await api.get('/rewards/badges');

      set({
        totalStars: resOverview.data?.totalStars ?? 0,
        stickers: resStickers.data ?? [],
        badges: resBadges.data ?? [],
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to refresh rewards' });
    } finally {
      set({ loading: false });
    }
  },
}));
