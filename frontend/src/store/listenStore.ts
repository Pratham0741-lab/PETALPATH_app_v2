import { create } from 'zustand';
import { api } from '../api/client';
import { useRoadmapStore } from './roadmapStore';
import { getLessonMatchData } from '../utils/lessonActivityMatcher';

export interface AudioItem {
  id: string;
  activityId: string;
  title: string;
  audioUrl: string;
  duration: number;
}

interface ListenState {
  currentAudio: AudioItem | null;
  isComingSoon: boolean;
  selectedAnswer: string | null;
  correctAnswer: string;
  options: string[];
  isCompleted: boolean;
  loading: boolean;
  lives: number;
  error: string | null;

  loadAudio: (activityId: string, activityTitle: string) => Promise<void>;
  selectAnswer: (answer: string) => void;
  submitAnswer: () => Promise<boolean>;
  retry: () => void;
  completeActivity: () => Promise<void>;
  clearState: () => void;
}

// Helper to generate multiple-choice options locally based on activity and lesson matching logic
function generateOptionsForActivity(lessonTitle: string, activityTitle: string): { options: string[]; correct: string } {
  const match = getLessonMatchData(lessonTitle, activityTitle);
  const correct = match.correctAnswer;

  let options: string[] = [correct];
  
  if (correct.startsWith('Letter ')) {
    const activeLetter = correct.replace('Letter ', '').toUpperCase();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const otherLetters = alphabet.split('').filter((l) => l !== activeLetter);
    const selected = otherLetters.sort(() => Math.random() - 0.5).slice(0, 2);
    options = [correct, `Letter ${selected[0]}`, `Letter ${selected[1]}`];
  } else if (correct.startsWith('Number ')) {
    const activeNum = parseInt(correct.replace('Number ', ''), 10) || 1;
    const candidates = Array.from({ length: 10 }, (_, i) => i + 1).filter((n) => n !== activeNum);
    const selected = candidates.sort(() => Math.random() - 0.5).slice(0, 2);
    options = [correct, `Number ${selected[0]}`, `Number ${selected[1]}`];
  } else {
    const shapes = ['Standing Line', 'Sleeping Line', 'Left Curve', 'Right Curve', 'Circle', 'Square', 'Triangle'];
    const filtered = shapes.filter((s) => s.toLowerCase() !== correct.toLowerCase());
    const selected = filtered.sort(() => Math.random() - 0.5).slice(0, 2);
    options = [correct, selected[0], selected[1]];
  }

  // Shuffle options
  const shuffled = options.sort(() => Math.random() - 0.5);
  return {
    options: shuffled,
    correct,
  };
}

export const useListenStore = create<ListenState>((set, get) => {
  return {
    currentAudio: null,
    isComingSoon: false,
    selectedAnswer: null,
    correctAnswer: '',
    options: [],
    isCompleted: false,
    loading: false,
    error: null,
    lives: 3,

    loadAudio: async (activityId, activityTitle) => {
      set({ loading: true, error: null });
      try {
        const audioRes = await api.get(`/audio?activityId=${activityId}`);
        let audios = audioRes.data || [];
        let isComingSoon = false;
        let audio;

        if (audios.length === 0 || (audios.length > 0 && audios[0].filename === 'coming_soon')) {
          audio = {
            id: 'placeholder-audio-id',
            activityId,
            title: activityTitle || 'Audio Guide',
            audioUrl: 'coming_soon',
            filename: 'coming_soon',
            duration: 10,
          };
          isComingSoon = true;
        } else {
          audio = {
            ...audios[0],
            activityId,
          };
        }
        
        // Fetch progress from backend
        let isCompleted = false;
        try {
          const progressRes = await api.get(`/listen-progress/${activityId}`);
          if (progressRes.success && progressRes.data) {
            isCompleted = progressRes.data.isCompleted || false;
          }
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to load listen progress:', err);
        }

        const lessonTitle = useRoadmapStore.getState().selectedLesson?.title || '';
        const { options, correct } = generateOptionsForActivity(lessonTitle, activityTitle);

        set({
          currentAudio: audio,
          isCompleted,
          options,
          correctAnswer: correct,
          isComingSoon,
        });
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to load audio' });
      } finally {
        set({ loading: false });
      }
    },

    selectAnswer: (answer) => {
      set({ selectedAnswer: answer });
    },

    submitAnswer: async () => {
      const { selectedAnswer, correctAnswer, currentAudio } = get();
      if (!selectedAnswer || !currentAudio) return false;

      const isCorrect = selectedAnswer === correctAnswer;
      if (isCorrect) {
        set({ isCompleted: true });
        try {
          await api.post('/listen-progress/complete', {
            activityId: currentAudio.activityId,
          });
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to mark listen progress complete:', err);
        }
      }
      return isCorrect;
    },

    retry: () => {
      set({ selectedAnswer: null });
    },

    completeActivity: async () => {
      const { currentAudio } = get();
      if (!currentAudio) return;

      set({ isCompleted: true });
      try {
        await api.post('/listen-progress/complete', {
          activityId: currentAudio.activityId,
        });
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to mark listen progress complete:', err);
      }
    },

    clearState: () => {
      set({
        currentAudio: null,
        isComingSoon: false,
        selectedAnswer: null,
        correctAnswer: '',
        options: [],
        isCompleted: false,
        loading: false,
        error: null,
        lives: 3,
      });
    },
  };
});


