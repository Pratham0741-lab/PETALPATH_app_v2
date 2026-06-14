import { create } from 'zustand';
import { MENTORS, Mentor } from '../constants/mentors';
import { storage } from '../utils/storage';

interface Progress {
  currentLevel: number;
  completedActivities: string[];
  completedLessons: string[];
}

interface Preferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
}

interface AppState {
  stars: number;
  activeMentor: Mentor;
  progress: Progress;
  preferences: Preferences;
  
  // Auth state
  token: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; name: string; role: string } | null;
  loadingSession: boolean;
  
  // Actions
  addStars: (count: number) => void;
  setMentor: (mentorId: string) => void;
  completeActivity: (activityId: string) => void;
  completeLesson: (lessonId: string) => void;
  setLevel: (level: number) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  
  // Auth actions
  setSession: (sessionData: { accessToken: string; refreshToken: string; user: { id: string; email: string; name: string; role: string } }) => Promise<void>;
  setToken: (token: string) => Promise<void>;
  clearSession: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  stars: 12, // Starting stars for playful validation
  activeMentor: MENTORS[0], // Default is Dax the Dinosaur
  progress: {
    currentLevel: 1,
    completedActivities: [],
    completedLessons: [],
  },
  preferences: {
    soundEnabled: true,
    musicEnabled: true,
  },
  
  token: null,
  refreshToken: null,
  user: null,
  loadingSession: true,
  
  addStars: (count) => set((state) => ({ stars: state.stars + count })),
  
  setMentor: (mentorId) => set(() => {
    const selected = MENTORS.find((m) => m.id === mentorId) || MENTORS[0];
    return { activeMentor: selected };
  }),
  
  completeActivity: (activityId) => set((state) => ({
    progress: {
      ...state.progress,
      completedActivities: state.progress.completedActivities.includes(activityId)
        ? state.progress.completedActivities
        : [...state.progress.completedActivities, activityId],
    },
  })),
  
  completeLesson: (lessonId) => set((state) => ({
    progress: {
      ...state.progress,
      completedLessons: state.progress.completedLessons.includes(lessonId)
        ? state.progress.completedLessons
        : [...state.progress.completedLessons, lessonId],
    },
  })),
  
  setLevel: (level) => set((state) => ({
    progress: {
      ...state.progress,
      currentLevel: level,
    },
  })),
  
  toggleSound: () => set((state) => ({
    preferences: {
      ...state.preferences,
      soundEnabled: !state.preferences.soundEnabled,
    },
  })),
  
  toggleMusic: () => set((state) => ({
    preferences: {
      ...state.preferences,
      musicEnabled: !state.preferences.musicEnabled,
    },
  })),
  
  setSession: async (sessionData) => {
    await storage.setItem('token', sessionData.accessToken);
    await storage.setItem('refreshToken', sessionData.refreshToken);
    await storage.setItem('user', JSON.stringify(sessionData.user));
    set(() => ({
      token: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      user: sessionData.user,
    }));
  },

  setToken: async (token) => {
    await storage.setItem('token', token);
    set(() => ({
      token,
    }));
  },
  
  clearSession: async () => {
    await storage.removeItem('token');
    await storage.removeItem('refreshToken');
    await storage.removeItem('user');
    await storage.removeItem('activeChild');
    
    // Explicitly import and clear childStore as well
    const { useChildStore } = await import('./childStore');
    useChildStore.setState({ activeChild: null, childrenList: [] });

    set(() => ({
      token: null,
      refreshToken: null,
      user: null,
    }));
  },

  loadSession: async () => {
    try {
      const token = await storage.getItem('token');
      const refreshToken = await storage.getItem('refreshToken');
      const rawUser = await storage.getItem('user');
      let user = null;
      try {
        user = rawUser ? JSON.parse(rawUser) : null;
      } catch {}

      // Hydrate child store activeChild as well
      const rawActiveChild = await storage.getItem('activeChild');
      let activeChild = null;
      try {
        activeChild = rawActiveChild ? JSON.parse(rawActiveChild) : null;
      } catch {}

      const { useChildStore } = await import('./childStore');
      useChildStore.setState({ activeChild });

      set({
        token,
        refreshToken,
        user,
        loadingSession: false,
      });
    } catch (err) {
      console.warn('Failed to load session:', err);
      set({ loadingSession: false });
    }
  },
}));
