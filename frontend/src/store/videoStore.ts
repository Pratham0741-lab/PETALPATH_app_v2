import { create } from 'zustand';
import { api } from '../api/client';

export interface Video {
  id: string;
  activityId: string;
  title: string;
  videoUrl: string;
  filename: string;
  thumbnailUrl: string | null;
  duration: number;
}

interface VideoState {
  currentVideo: Video | null;
  currentPosition: number;
  duration: number;
  isCompleted: boolean;
  isPlaying: boolean;
  loading: boolean;
  error: string | null;

  loadVideo: (activityId: string) => Promise<void>;
  savePosition: (position: number) => Promise<void>;
  resumeVideo: () => void;
  pauseVideo: () => void;
  completeVideo: () => Promise<void>;
  clearState: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => {
  let saveTimeout: any = null;

  return {
    currentVideo: null,
    currentPosition: 0,
    duration: 0,
    isCompleted: false,
    isPlaying: false,
    loading: false,
    error: null,

    loadVideo: async (activityId) => {
      set({ loading: true, error: null, isPlaying: false });
      try {
        const videoRes = await api.get(`/videos?activityId=${activityId}`);
        const videos = videoRes.data || [];
        if (videos.length === 0) {
          throw new Error('No video found for this activity');
        }

        const video = videos[0];
        
        // Fetch progress from backend
        let watchPosition = 0;
        let isCompleted = false;
        try {
          const progressRes = await api.get(`/video-progress/${video.id}`);
          if (progressRes.success && progressRes.data) {
            watchPosition = progressRes.data.watchPosition || 0;
            isCompleted = progressRes.data.isCompleted || false;
          }
        } catch (err) {
          console.warn('Failed to load video progress:', err);
        }

        set({
          currentVideo: video,
          duration: video.duration,
          currentPosition: watchPosition,
          isCompleted,
        });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load video' });
      } finally {
        set({ loading: false });
      }
    },

    savePosition: async (position) => {
      const { currentVideo, isCompleted } = get();
      if (!currentVideo) return;

      const roundedPosition = Math.floor(position);
      set({ currentPosition: roundedPosition });

      // Throttle database saves to avoid hammering the server
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      saveTimeout = setTimeout(async () => {
        try {
          const res = await api.post('/video-progress', {
            videoId: currentVideo.id,
            watchPosition: roundedPosition,
          });
          if (res.success && res.data) {
            // Update completion status returned from backend (centralized 95% threshold logic)
            set({ isCompleted: res.data.isCompleted });
          }
        } catch (err) {
          console.warn('Failed to save watch position:', err);
        }
      }, 2000);
    },

    resumeVideo: () => set({ isPlaying: true }),

    pauseVideo: () => set({ isPlaying: false }),

    completeVideo: async () => {
      const { currentVideo } = get();
      if (!currentVideo) return;

      set({ isCompleted: true, isPlaying: false });
      try {
        await api.post('/video-progress/complete', {
          videoId: currentVideo.id,
        });
      } catch (err) {
        console.warn('Failed to mark video as complete:', err);
      }
    },

    clearState: () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      set({
        currentVideo: null,
        currentPosition: 0,
        duration: 0,
        isCompleted: false,
        isPlaying: false,
        loading: false,
        error: null,
      });
    },
  };
});
