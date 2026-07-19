import { create } from 'zustand';
import { api } from '../api/client';
import { useRoadmapStore } from './roadmapStore';
import { getLessonMatchData } from '../utils/lessonActivityMatcher';

export interface Point {
  x: number;
  y: number;
}

interface WriteState {
  activityId: string | null;
  guideName: string;
  strokes: Point[][];
  isCompleted: boolean;
  accuracyScore: number | null;
  stars: number | null;
  loading: boolean;
  lives: number;
  error: string | null;

  loadWrite: (activityId: string, activityTitle: string) => Promise<void>;
  addStroke: (stroke: Point[]) => void;
  undo: () => void;
  clear: () => void;
  completeActivity: (accuracy?: number, stars?: number) => Promise<void>;
  clearState: () => void;
}

export const useWriteStore = create<WriteState>((set, get) => {
  return {
    activityId: null,
    guideName: '',
    strokes: [],
    isCompleted: false,
    accuracyScore: null,
    stars: null,
    loading: false,
    error: null,
    lives: 3,

    loadWrite: async (activityId, activityTitle) => {
      set({ loading: true, error: null, strokes: [], accuracyScore: null, stars: null });
      try {
        const lessonTitle = useRoadmapStore.getState().selectedLesson?.title || '';
        const match = getLessonMatchData(lessonTitle, activityTitle);
        const guide = match.guideName;
        
        let isCompleted = false;
        try {
          const progressRes = await api.get(`/write-progress/${activityId}`);
          if (progressRes.success && progressRes.data) {
            isCompleted = progressRes.data.isCompleted || false;
          }
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to load write progress:', err);
        }

        set({
          activityId,
          guideName: guide,
          isCompleted,
        });
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to load write activity' });
      } finally {
        set({ loading: false });
      }
    },

    addStroke: (stroke) => {
      set((state) => ({
        strokes: [...state.strokes, stroke],
      }));
    },

    undo: () => {
      set((state) => ({
        strokes: state.strokes.slice(0, -1),
      }));
    },

    clear: () => {
      set({ strokes: [] });
    },

    completeActivity: async (accuracy?: number, earnedStars?: number) => {
      const { activityId } = get();
      if (!activityId) return;

      const finalAccuracy = accuracy ?? 0;
      const finalStars = earnedStars ?? 0;
      set({ isCompleted: true, accuracyScore: finalAccuracy, stars: finalStars });
      try {
        await api.post('/write-progress/complete', {
          activityId,
          score: finalAccuracy,
        });
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to mark write progress complete:', err);
      }
    },

    clearState: () => {
      set({
        activityId: null,
        guideName: '',
        strokes: [],
        isCompleted: false,
        accuracyScore: null,
        stars: null,
        loading: false,
        error: null,
        lives: 3,
      });
    },
  };
});
