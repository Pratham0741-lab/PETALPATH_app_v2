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
  stars: 0, // Stars come from backend via rewardsStore
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
    
    // Also save via storageService for SecureStore compatibility
    try {
      const { storageService, StorageKeys } = await import('../services/storage');
      await storageService.setItem(StorageKeys.AUTH_TOKEN, sessionData.accessToken);
      await storageService.setItem(StorageKeys.REFRESH_TOKEN, sessionData.refreshToken);
      await storageService.setItem(StorageKeys.USER, sessionData.user);
    } catch {}

    // Sync authStore as well
    const { useAuthStore } = await import('./authStore');
    useAuthStore.setState({
      user: sessionData.user as any,
      token: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });

    set(() => ({
      token: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      user: sessionData.user as any,
      loadingSession: false,
    }));
  },

  setToken: async (token) => {
    await storage.setItem('token', token);
    
    const { useAuthStore } = await import('./authStore');
    useAuthStore.setState({
      token,
      isAuthenticated: !!token,
    });

    set(() => ({
      token,
    }));
  },
  
  clearSession: async () => {
    await storage.removeItem('token');
    await storage.removeItem('refreshToken');
    await storage.removeItem('user');
    await storage.removeItem('activeChild');
    
    try {
      const { storageService, StorageKeys } = await import('../services/storage');
      await storageService.removeItem(StorageKeys.AUTH_TOKEN);
      await storageService.removeItem(StorageKeys.REFRESH_TOKEN);
      await storageService.removeItem(StorageKeys.USER);
    } catch {}

    const { useChildStore } = await import('./childStore');
    useChildStore.setState({ activeChild: null, childrenList: [] });

    const { useAuthStore } = await import('./authStore');
    useAuthStore.setState({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    
    set(() => ({
      token: null,
      refreshToken: null,
      user: null,
      loadingSession: false,
    }));
  },

  loadSession: async () => {
    try {
      let token = await storage.getItem('token');
      let refreshToken = await storage.getItem('refreshToken');
      let rawUser = await storage.getItem('user');

      // Check fallback storageService keys
      if (!token || !refreshToken || !rawUser) {
        try {
          const { storageService, StorageKeys } = await import('../services/storage');
          if (!token) token = await storageService.getItem<string>(StorageKeys.AUTH_TOKEN);
          if (!refreshToken) refreshToken = await storageService.getItem<string>(StorageKeys.REFRESH_TOKEN);
          if (!rawUser) {
            const u = await storageService.getItem<any>(StorageKeys.USER);
            if (u) rawUser = typeof u === 'string' ? u : JSON.stringify(u);
          }
        } catch {}
      }

      let user = null;
      try {
        user = rawUser ? (typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser) : null;
      } catch {}

      // Refresh an expired access token before mounting authenticated routes.
      if (token && refreshToken && user) {
        const { authService } = await import('../services/auth/authService');
        if (authService.isTokenExpired(token)) {
          const refreshed = await authService.refreshSession();
          if (!refreshed) {
            const { useAppStore: appStore } = await import('./appStore');
            await appStore.getState().clearSession();
            return;
          }

          const { useAuthStore } = await import('./authStore');
          const refreshedSession = useAuthStore.getState();
          token = refreshedSession.token;
          refreshToken = refreshedSession.refreshToken;
          user = refreshedSession.user;
        }
      }

      // If we loaded tokens from fallback, ensure primary storage is populated
      if (token && refreshToken && user) {
        await storage.setItem('token', token);
        await storage.setItem('refreshToken', refreshToken);
        await storage.setItem('user', JSON.stringify(user));
      }

      // Hydrate child store activeChild
      const rawActiveChild = await storage.getItem('activeChild');
      let activeChild = null;
      try {
        activeChild = rawActiveChild ? (typeof rawActiveChild === 'string' ? JSON.parse(rawActiveChild) : rawActiveChild) : null;
      } catch {}

      const { useChildStore } = await import('./childStore');
      useChildStore.setState({ activeChild });

      // Synchronize authStore as well!
      const { useAuthStore } = await import('./authStore');
      useAuthStore.setState({
        token,
        refreshToken,
        user,
        isAuthenticated: !!token,
        isLoading: false,
      });

      set({
        token,
        refreshToken,
        user,
        loadingSession: false,
      });
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Failed to load session:', err);
      set({ loadingSession: false });
    }
  },
}));
