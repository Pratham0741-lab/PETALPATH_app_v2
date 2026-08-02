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

  loadVideo: (activityId: string, activityTitle?: string) => Promise<void>;
  savePosition: (position: number) => Promise<void>;
  resumeVideo: () => void;
  pauseVideo: () => void;
  completeVideo: () => Promise<void>;
  clearState: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  return {
    currentVideo: null,
    currentPosition: 0,
    duration: 0,
    isCompleted: false,
    isPlaying: false,
    loading: false,
    error: null,

    loadVideo: async (activityId, activityTitle) => {
      set({ loading: true, error: null, isPlaying: false });
      try {
        const videoRes = await api.get(`/videos?activityId=${activityId}`);
        const videos = videoRes.data || [];
        let video;
        if (videos.length === 0) {
          video = {
            id: 'placeholder-video-id',
            activityId,
            title: activityTitle || 'Video Lesson',
            videoUrl: 'coming_soon',
            filename: 'coming_soon',
            thumbnailUrl: null,
            duration: 10,
          };
        } else {
          video = videos[0];
        }
        
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
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to load video progress:', err);
        }

        set({
          currentVideo: video,
          duration: video.duration,
          currentPosition: watchPosition,
          isCompleted,
        });
    } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to load video' });
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
            activityId: currentVideo.activityId,
            watchPosition: roundedPosition,
          });
          if (res.success && res.data) {
            // Update completion status returned from backend (centralized 95% threshold logic)
            set({ isCompleted: res.data.isCompleted });
          }
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to save watch position:', err);
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
          activityId: currentVideo.activityId,
        });
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to mark video as complete:', err);
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
