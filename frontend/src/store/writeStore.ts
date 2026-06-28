import { create } from 'zustand';
import { api } from '../api/client';

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
  error: string | null;

  loadWrite: (activityId: string, activityTitle: string) => Promise<void>;
  addStroke: (stroke: Point[]) => void;
  undo: () => void;
  clear: () => void;
  completeActivity: (accuracy?: number, stars?: number) => Promise<void>;
  clearState: () => void;
}

function deriveGuideName(title: string): string {
  return title
    .replace('Listen to ', '')
    .replace('Say ', '')
    .replace('Trace ', '')
    .replace('Watch ', '')
    .replace(' Tutorial', '')
    .replace(' Audio Guide', '')
    .trim();
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

    loadWrite: async (activityId, activityTitle) => {
      set({ loading: true, error: null, strokes: [], accuracyScore: null, stars: null });
      try {
        const guide = deriveGuideName(activityTitle);
        
        let isCompleted = false;
        try {
          const progressRes = await api.get(`/write-progress/${activityId}`);
          if (progressRes.success && progressRes.data) {
            isCompleted = progressRes.data.isCompleted || false;
          }
        } catch (err) {
          console.warn('Failed to load write progress:', err);
        }

        set({
          activityId,
          guideName: guide,
          isCompleted,
        });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load write activity' });
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

    completeActivity: async (accuracy = 100, stars = 3) => {
      const { activityId } = get();
      if (!activityId) return;

      set({ isCompleted: true, accuracyScore: accuracy, stars });
      try {
        await api.post('/write-progress/complete', {
          activityId,
          score: accuracy,
        });
      } catch (err) {
        console.warn('Failed to mark write progress complete:', err);
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
      });
    },
  };
});
