import { create } from 'zustand';
import { api } from '../api/client';
import { useRoadmapStore } from './roadmapStore';
import { useChildStore } from './childStore';
import { getLessonMatchData } from '../utils/lessonActivityMatcher';
import { guideNameForItem, hasGuideForItem } from '../utils/traceGuides';
import { storageService, StorageKeys } from '../services/storage';

/**
 * A point in the canvas's drawing space.
 *
 * There is exactly one such space per tracing activity and it never changes
 * size — `TracingCanvas` freezes it at the first measurement of the board and
 * fits it to the frame with an SVG `viewBox` from then on. That is why these are
 * plain pixels and not fractions: the guide geometry, the strokes and
 * `calculateTracingAccuracy`'s board-relative reach all have to be in the same
 * units, and a stroke that gets re-projected every time the board resizes drifts
 * off the guide it was drawn on.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * A revision lesson's tracing steps through every item of its topic (A-Z,
 * a-z, 1-50, अ-अः…; the server sends them as `traceItems`). The child traces
 * one item at a time; where they are is saved after each one, so a child can
 * stop and come back to the same item. The activity completes after the last
 * item, scored on the average accuracy of all of them.
 */
export interface TraceSequence {
  items: string[];
  index: number;
  /** Raw accuracy (0-100) of each item traced so far, in order. */
  scores: number[];
}

type SavedSequences = Record<string, { index: number; scores: number[] }>;

const sequenceKey = (activityId: string) => `${useChildStore.getState().activeChild?.id ?? 'anon'}:${activityId}`;

async function saveSequence(activityId: string, seq: TraceSequence | null): Promise<void> {
  try {
    const all = (await storageService.getItem<SavedSequences>(StorageKeys.TRACE_PROGRESS)) ?? {};
    const key = sequenceKey(activityId);
    if (seq) all[key] = { index: seq.index, scores: seq.scores };
    else delete all[key];
    await storageService.setItem(StorageKeys.TRACE_PROGRESS, all);
  } catch {
    /* Not saved: the child would restart the sequence, nothing worse. */
  }
}

async function loadSequence(activityId: string, items: string[]): Promise<TraceSequence> {
  const all = (await storageService.getItem<SavedSequences>(StorageKeys.TRACE_PROGRESS)) ?? {};
  const saved = all[sequenceKey(activityId)];
  if (!saved || saved.index >= items.length || saved.scores.length !== saved.index) {
    return { items, index: 0, scores: [] };
  }
  return { items, index: saved.index, scores: saved.scores };
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
  /** Set for a revision lesson's step-through; null for a single-target trace. */
  sequence: TraceSequence | null;

  /** `traceItems` comes with the activity that was opened (revision lessons). */
  loadWrite: (activityId: string, activityTitle: string, traceItems?: string[]) => Promise<void>;
  addStroke: (stroke: Point[]) => void;
  undo: () => void;
  clear: () => void;
  completeActivity: (accuracy?: number, stars?: number) => Promise<void>;
  /** Records the current item's raw accuracy; true when it was the last item. */
  recordItem: (rawAccuracy: number) => boolean;
  /** Moves to the next item with a clean board. */
  nextItem: () => void;
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
    sequence: null,

    loadWrite: async (activityId, activityTitle, traceItems) => {
      set({ loading: true, error: null, strokes: [], accuracyScore: null, stars: null, sequence: null });
      try {
        const lessonTitle = useRoadmapStore.getState().selectedLesson?.title || '';
        /*
         * The list comes with the activity that was opened. The lookups are a
         * fallback only: a lesson started from Home runs on the roadmap's own
         * activity list, which is not `activities`, so looking only there lost
         * the list and the board stayed on the first guide ("A") for ever.
         */
        const { activities, selectedLesson } = useRoadmapStore.getState();
        const found =
          activities.find((a) => a.id === activityId) ??
          selectedLesson?.activities?.find((a) => a.id === activityId);
        // Items without a guide are skipped rather than shown as a blank board.
        const items = (traceItems ?? found?.traceItems ?? []).filter(hasGuideForItem);

        let isCompleted = false;
        try {
          const progressRes = await api.get(`/write-progress/${activityId}`);
          if (progressRes.success && progressRes.data) {
            isCompleted = progressRes.data.isCompleted || false;
          }
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to load write progress:', err);
        }

        if (items.length > 0) {
          const sequence = await loadSequence(activityId, items);
          set({
            activityId,
            sequence,
            guideName: guideNameForItem(items[sequence.index]),
            isCompleted,
          });
        } else {
          set({
            activityId,
            guideName: getLessonMatchData(lessonTitle, activityTitle).guideName,
            isCompleted,
          });
        }
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

    recordItem: (rawAccuracy) => {
      const { sequence, activityId } = get();
      if (!sequence || !activityId) return true;
      const scores = [...sequence.scores, rawAccuracy];
      const last = scores.length >= sequence.items.length;
      const next = { ...sequence, scores };
      set({ sequence: next });
      // Saved as "this item done, the next one up", so leaving now resumes on it.
      void saveSequence(activityId, last ? null : { ...next, index: sequence.index + 1 });
      return last;
    },

    nextItem: () => {
      const { sequence } = get();
      if (!sequence) return;
      const index = Math.min(sequence.index + 1, sequence.items.length - 1);
      set({
        sequence: { ...sequence, index },
        guideName: guideNameForItem(sequence.items[index]),
        strokes: [],
        accuracyScore: null,
        stars: null,
      });
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
        sequence: null,
      });
    },
  };
});
