import { create } from 'zustand';
import { api } from '../api/client';
import { useRewardsStore } from './rewardsStore';

export interface ContinueLearningTarget {
  category: { id: string; title: string };
  module: { id: string; title: string };
  lesson: { id: string; title: string };
}

interface ProgressState {
  completionPercentage: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  continueLearning: ContinueLearningTarget | null;
  recentAchievements: {
    badges: any[];
    stickers: any[];
  };
  loading: boolean;
  error: string | null;

  refreshProgress: () => Promise<void>;
  completeLesson: (lessonId: string) => Promise<{
    success: boolean;
    becameCompleted: boolean;
    moduleCompleted: boolean;
    categoryCompleted: boolean;
    starsEarned: number;
    totalStars: number;
  }>;
}

export const useProgressStore = create<ProgressState>((set) => ({
  completionPercentage: 0,
  completedLessonsCount: 0,
  totalLessonsCount: 0,
  continueLearning: null,
  recentAchievements: {
    badges: [],
    stickers: [],
  },
  loading: false,
  error: null,

  refreshProgress: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/progress/overview');
      if (response.success && response.data) {
        set({
          completionPercentage: response.data.completionPercentage ?? 0,
          completedLessonsCount: response.data.completedLessonsCount ?? 0,
          totalLessonsCount: response.data.totalLessonsCount ?? 0,
          continueLearning: response.data.continueLearning ?? null,
          recentAchievements: response.data.recentAchievements ?? { badges: [], stickers: [] },
        });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch progress overview' });
    } finally {
      set({ loading: false });
    }
  },

  completeLesson: async (lessonId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/progress/complete', { lessonId });
      if (response.success && response.data) {
        useRewardsStore.setState({ totalStars: response.data.totalStars });
        return {
          success: true,
          becameCompleted: response.data.becameCompleted,
          moduleCompleted: response.data.moduleCompleted,
          categoryCompleted: response.data.categoryCompleted,
          starsEarned: response.data.starsEarned,
          totalStars: response.data.totalStars,
        };
      }
      throw new Error(response.message || 'Failed to complete lesson');
    } catch (err: any) {
      set({ error: err.message || 'Failed to complete lesson' });
      return {
        success: false,
        becameCompleted: false,
        moduleCompleted: false,
        categoryCompleted: false,
        starsEarned: 0,
        totalStars: 0,
      };
    } finally {
      set({ loading: false });
    }
  },
}));
