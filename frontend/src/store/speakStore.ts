import { create } from 'zustand';
import { api } from '../api/client';
import { useRoadmapStore } from './roadmapStore';
import { getLessonMatchData } from '../utils/lessonActivityMatcher';
import { scoreActivity, starsForAccuracy, stringSimilarity } from '../utils/activityScoring';

/** A matched attempt below this raw similarity is treated as "not quite right". */
const RAW_MATCH_FLOOR = 40;

interface SpeakState {
  activityId: string | null;
  targetPhrase: string;
  transcript: string;
  confidence: number;
  stars: number | null;
  isRecording: boolean;
  isCompleted: boolean;
  loading: boolean;
  lives: number;
  error: string | null;
  isComingSoon: boolean;

  loadSpeak: (activityId: string, activityTitle: string) => Promise<void>;
  startRecording: () => void;
  stopRecording: (finalTranscript: string, confidenceScore: number) => Promise<boolean>;
  retry: () => void;
  completeActivity: (score?: number) => Promise<void>;
  clearState: () => void;
}

export const useSpeakStore = create<SpeakState>((set, get) => {
  return {
    activityId: null,
    targetPhrase: '',
    transcript: '',
    confidence: 0,
    stars: null,
    isRecording: false,
    isCompleted: false,
    loading: false,
    error: null,
    lives: 3,
    isComingSoon: false,

    loadSpeak: async (activityId, activityTitle) => {
      set({ loading: true, error: null, transcript: '', confidence: 0, stars: null, isRecording: false, isComingSoon: false });
      try {
        const isComingSoon = !activityId || !activityTitle || activityTitle.toLowerCase().includes('coming_soon') || activityTitle.toLowerCase().includes('placeholder');
        
        if (isComingSoon) {
          set({
            activityId: activityId || 'placeholder-speak-id',
            targetPhrase: useRoadmapStore.getState().selectedLesson?.title || 'Speaking Practice',
            isCompleted: false,
            confidence: 0,
            stars: null,
            isComingSoon: true,
          });
          return;
        }

        const lessonTitle = useRoadmapStore.getState().selectedLesson?.title || '';
        const match = getLessonMatchData(lessonTitle, activityTitle);
        const target = match.targetPhrase;
        
        let isCompleted = false;
        let confidence = 0;
        try {
          const progressRes = await api.get(`/speak-progress/${activityId}`);
          if (progressRes.success && progressRes.data) {
            isCompleted = progressRes.data.isCompleted || false;
            confidence = Math.round(progressRes.data.bestScore * 100);
          }
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to load speak progress:', err);
        }

        // Stored `confidence` is an already-shown accuracy, so derive stars from it
        // directly (no second honesty pass) — same mapping as everywhere else.
        const starsCount = isCompleted ? starsForAccuracy(confidence) : null;

        set({
          activityId,
          targetPhrase: target,
          isCompleted,
          confidence,
          stars: starsCount,
          isComingSoon: false,
        });
      } catch (err: unknown) {
        // Fallback to placeholder instead of hard crash
        set({
          activityId: activityId || 'placeholder-speak-id',
          targetPhrase: useRoadmapStore.getState().selectedLesson?.title || 'Speaking Practice',
          isCompleted: false,
          confidence: 0,
          stars: null,
          isComingSoon: true,
        });
      } finally {
        set({ loading: false });
      }
    },

    startRecording: () => {
      set({ isRecording: true, transcript: '', confidence: 0, stars: null });
    },

    stopRecording: async (finalTranscript, confidenceScore) => {
      const { activityId, targetPhrase } = get();
      if (!activityId) return false;

      // Clean text helpers
      const cleanText = (t: string) => t.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
      const cleanTarget = cleanText(targetPhrase);
      const cleanInput = cleanText(finalTranscript);

      // How close what they said is to the target, 0-100. This is the real
      // measure — the old path defaulted to a flat 90% whenever the recognizer
      // reported no confidence, which is what made the accuracy meaningless.
      const containment = cleanInput.includes(cleanTarget) || cleanTarget.includes(cleanInput);
      const similarity = stringSimilarity(cleanInput, cleanTarget) * 100;
      // The recognizer's own confidence, when it actually reports one, nudges the
      // score; it is only a minor signal because it says nothing about *which*
      // words were heard. Normalised to 0-100.
      let recogPercent = 0;
      if (confidenceScore > 0) recogPercent = confidenceScore > 1 ? confidenceScore : confidenceScore * 100;
      const rawScore = recogPercent > 0 ? similarity * 0.7 + recogPercent * 0.3 : similarity;

      // Accepted if the words line up or the phrase is clearly contained; a near-
      // miss below the floor is a genuine retry, scored 0 and no stars.
      const isMatch = containment || rawScore >= RAW_MATCH_FLOOR;
      if (!isMatch) {
        set({
          transcript: finalTranscript,
          confidence: 0,
          stars: 0,
          isRecording: false,
        });
        return false;
      }

      // One place turns the raw score into the shown accuracy + stars, softened by
      // the honesty level, so the meter and the stars can never disagree.
      const { accuracy, stars: starsCount } = scoreActivity(rawScore);

      set({
        transcript: finalTranscript,
        confidence: accuracy,
        stars: starsCount,
        isRecording: false,
        isCompleted: true,
      });

      try {
        await api.post('/speak-progress/complete', {
          activityId,
          score: accuracy,
        });
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to mark speak progress complete:', err);
      }

      return true;
    },

    retry: () => {
      set({ transcript: '', confidence: 0, isRecording: false });
    },

    completeActivity: async (score) => {
      const { activityId } = get();
      if (!activityId) return;

      const finalScore = score !== undefined ? score : 95;
      const starsCount = starsForAccuracy(finalScore);
      set({ isCompleted: true, confidence: finalScore, stars: starsCount });
      try {
        await api.post('/speak-progress/complete', {
          activityId,
          score: finalScore,
        });
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to mark speak progress complete:', err);
      }
    },

    clearState: () => {
      set({
        activityId: null,
        targetPhrase: '',
        transcript: '',
        confidence: 0,
        stars: null,
        isRecording: false,
        isCompleted: false,
        loading: false,
        error: null,
        lives: 3,
        isComingSoon: false,
      });
    },
  };
});
