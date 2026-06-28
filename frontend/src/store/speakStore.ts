import { create } from 'zustand';
import { api } from '../api/client';

interface SpeakState {
  activityId: string | null;
  targetPhrase: string;
  transcript: string;
  confidence: number;
  stars: number | null;
  isRecording: boolean;
  isCompleted: boolean;
  loading: boolean;
  error: string | null;

  loadSpeak: (activityId: string, activityTitle: string) => Promise<void>;
  startRecording: () => void;
  stopRecording: (finalTranscript: string, confidenceScore: number) => Promise<boolean>;
  retry: () => void;
  completeActivity: (score?: number) => Promise<void>;
  clearState: () => void;
}

function deriveTargetPhrase(title: string): string {
  return title
    .replace('Listen to ', '')
    .replace('Say ', '')
    .replace('Trace ', '')
    .replace('Watch ', '')
    .replace(' Tutorial', '')
    .replace(' Audio Guide', '')
    .trim();
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

    loadSpeak: async (activityId, activityTitle) => {
      set({ loading: true, error: null, transcript: '', confidence: 0, stars: null, isRecording: false });
      try {
        const target = deriveTargetPhrase(activityTitle);
        
        let isCompleted = false;
        let confidence = 0;
        try {
          const progressRes = await api.get(`/speak-progress/${activityId}`);
          if (progressRes.success && progressRes.data) {
            isCompleted = progressRes.data.isCompleted || false;
            confidence = Math.round(progressRes.data.bestScore * 100);
          }
        } catch (err) {
          console.warn('Failed to load speak progress:', err);
        }

        const starsCount = isCompleted ? (confidence >= 80 ? 3 : confidence >= 60 ? 2 : confidence >= 40 ? 1 : 0) : null;

        set({
          activityId,
          targetPhrase: target,
          isCompleted,
          confidence,
          stars: starsCount,
        });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load speak activity' });
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

      // Verify if they said the correct phrase
      const isMatch = cleanInput.includes(cleanTarget) || cleanTarget.includes(cleanInput) && cleanInput.length > 2;

      if (!isMatch) {
        set({
          transcript: finalTranscript,
          confidence: 0,
          stars: 0,
          isRecording: false,
        });
        return false;
      }

      // Calculate score based on similarity or mock confidence
      let calculatedScore = confidenceScore > 0 ? confidenceScore : 0.9;
      if (calculatedScore > 1) calculatedScore = calculatedScore / 100.0; // standardise to 0-1 scale

      const percentScore = Math.round(calculatedScore * 100);
      const starsCount = percentScore >= 80 ? 3 : percentScore >= 60 ? 2 : percentScore >= 40 ? 1 : 0;

      set({
        transcript: finalTranscript,
        confidence: percentScore,
        stars: starsCount,
        isRecording: false,
        isCompleted: true,
      });

      try {
        await api.post('/speak-progress/complete', {
          activityId,
          score: percentScore,
        });
      } catch (err) {
        console.warn('Failed to mark speak progress complete:', err);
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
      const starsCount = finalScore >= 80 ? 3 : finalScore >= 60 ? 2 : finalScore >= 40 ? 1 : 0;
      set({ isCompleted: true, confidence: finalScore, stars: starsCount });
      try {
        await api.post('/speak-progress/complete', {
          activityId,
          score: finalScore,
        });
      } catch (err) {
        console.warn('Failed to mark speak progress complete:', err);
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
      });
    },
  };
});
