import { create } from 'zustand';
import { api } from '../utils/api';
import { useRoadmapStore } from './roadmapStore';

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
  error: string | null;

  loadAudio: (activityId: string, activityTitle: string) => Promise<void>;
  selectAnswer: (answer: string) => void;
  submitAnswer: () => Promise<boolean>;
  retry: () => void;
  completeActivity: () => Promise<void>;
  clearState: () => void;
}

// Helper to generate multiple-choice options locally based on activity title and Roadmap tree
function generateOptionsForActivity(activityId: string, title: string): { options: string[]; correct: string } {
  let targetCategory: any = null;
  let targetModule: any = null;
  let targetLesson: any = null;

  try {
    const categories = useRoadmapStore.getState().categories;
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        for (const mod of cat.modules) {
          for (const les of mod.lessons) {
            if (les.activities && les.activities.some(act => act.id === activityId)) {
              targetCategory = cat;
              targetModule = mod;
              targetLesson = les;
              break;
            }
          }
          if (targetLesson) break;
        }
        if (targetLesson) break;
      }
    }
  } catch (e) {
    console.error('Error fetching curriculum context for listening options:', e);
  }

  if (targetLesson && targetModule) {
    // 1. Collect all lesson titles from the same module
    let optionCandidates = targetModule.lessons.map((l: any) => l.title);
    optionCandidates = Array.from(new Set(optionCandidates));

    // 2. If fewer than 3, fill from parent category
    if (optionCandidates.length < 3 && targetCategory) {
      for (const mod of targetCategory.modules) {
        for (const les of mod.lessons) {
          if (!optionCandidates.includes(les.title)) {
            optionCandidates.push(les.title);
          }
          if (optionCandidates.length >= 3) break;
        }
        if (optionCandidates.length >= 3) break;
      }
    }

    // 3. Fallback backfill pool if still less than 3
    const fallbackPool = [
      'Standing Line', 'Sleeping Line', 'Left Curve', 'Right Curve',
      'Circle', 'Square', 'Triangle', 'Letter A', 'Letter B', 'Letter C',
      'Number 1', 'Number 2', 'Number 3'
    ];
    if (optionCandidates.length < 3) {
      for (const fb of fallbackPool) {
        if (!optionCandidates.includes(fb)) {
          optionCandidates.push(fb);
        }
        if (optionCandidates.length >= 3) break;
      }
    }

    const correct = targetLesson.title;
    
    // Filter out the correct answer so we can select 2 other random options
    const otherCandidates = optionCandidates.filter((opt: string) => opt !== correct);
    const selectedOthers = otherCandidates.sort(() => Math.random() - 0.5).slice(0, 2);

    // Shuffle the final 3 options
    const finalOptions = [correct, ...selectedOthers].sort(() => Math.random() - 0.5);

    return {
      options: finalOptions,
      correct,
    };
  }

  // Fallback if not found in roadmap store
  let cleanName = title
    .replace('Listen to ', '')
    .replace('Say ', '')
    .replace('Trace ', '')
    .replace('Watch ', '')
    .replace(' Tutorial', '')
    .replace(' Audio Guide', '')
    .trim();

  let options = [cleanName];
  if (cleanName.includes('Standing Line')) {
    options = ['Standing Line', 'Sleeping Line', 'Left Curve'];
  } else if (cleanName.includes('Sleeping Line')) {
    options = ['Sleeping Line', 'Standing Line', 'Circle'];
  } else if (cleanName.includes('Left Curve')) {
    options = ['Left Curve', 'Circle', 'Standing Line'];
  } else if (cleanName.includes('Circle')) {
    options = ['Circle', 'Letter A', 'Sleeping Line'];
  } else if (cleanName.includes('Letter A')) {
    options = ['Letter A', 'Letter B', 'Letter C'];
  } else if (cleanName.includes('Number 1')) {
    options = ['Number 1', 'Number 2', 'Number 3'];
  } else {
    options = [cleanName, 'Option B', 'Option C'];
  }

  const finalOptions = Array.from(new Set(options)).sort(() => Math.random() - 0.5);
  while (finalOptions.length < 3) {
    finalOptions.push('Option ' + (finalOptions.length + 1));
  }

  return {
    options: finalOptions.slice(0, 3),
    correct: cleanName,
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

    loadAudio: async (activityId, activityTitle) => {
      set({ loading: true, error: null, selectedAnswer: null, isComingSoon: false });
      try {
        const audioRes = await api.get(`/audio?activityId=${activityId}`);
        let audios = audioRes.data || [];
        let isComingSoon = false;

        if (audios.length === 0 || (audios.length > 0 && audios[0].filename === 'coming_soon')) {
          // If target audio is not available, load a random audio from the system as fallback
          try {
            const allAudiosRes = await api.get('/audio');
            const allAudios = allAudiosRes.data || [];
            // Filter out any audio files that are marked 'coming_soon'
            const validAudios = allAudios.filter((a: any) => a.filename !== 'coming_soon');
            if (validAudios.length > 0) {
              const randomIndex = Math.floor(Math.random() * validAudios.length);
              audios = [validAudios[randomIndex]];
              isComingSoon = true;
            } else {
              throw new Error('No audio metadata found for this activity');
            }
          } catch (e) {
            throw new Error('No audio metadata found for this activity');
          }
        }

        const audio = audios[0];
        
        // Fetch progress from backend
        let isCompleted = false;
        try {
          const progressRes = await api.get(`/listen-progress/${activityId}`);
          if (progressRes.success && progressRes.data) {
            isCompleted = progressRes.data.isCompleted || false;
          }
        } catch (err) {
          console.warn('Failed to load listen progress:', err);
        }

        const { options, correct } = generateOptionsForActivity(activityId, activityTitle);

        set({
          currentAudio: audio,
          isCompleted,
          options,
          correctAnswer: correct,
          isComingSoon,
        });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load audio' });
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
          console.warn('Failed to mark listen progress complete:', err);
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
        console.warn('Failed to mark listen progress complete:', err);
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
      });
    },
  };
});
