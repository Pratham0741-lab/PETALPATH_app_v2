import { create } from 'zustand';
import { IS_DEV } from '../config/api';
import { storageService, StorageKeys } from '../services/storage';

interface UserPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
}

interface UserState {
  soundEnabled: boolean;
  musicEnabled: boolean;

  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  resetPreferences: () => void;

  loadPreferences: () => Promise<void>;
  persistPreferences: () => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  soundEnabled: true,
  musicEnabled: true,
};

export const useUserStore = create<UserState>((set, get) => ({
  soundEnabled: DEFAULT_PREFERENCES.soundEnabled,
  musicEnabled: DEFAULT_PREFERENCES.musicEnabled,

  setSoundEnabled: (enabled: boolean) => {
    set({ soundEnabled: enabled });
    get().persistPreferences();
  },

  setMusicEnabled: (enabled: boolean) => {
    set({ musicEnabled: enabled });
    get().persistPreferences();
  },

  resetPreferences: () => {
    set({ ...DEFAULT_PREFERENCES });
    get().persistPreferences();
  },

  loadPreferences: async () => {
    try {
      const stored = await storageService.getItem<UserPreferences>(StorageKeys.SETTINGS);
      if (stored) {
        set({
          soundEnabled: stored.soundEnabled ?? DEFAULT_PREFERENCES.soundEnabled,
          musicEnabled: stored.musicEnabled ?? DEFAULT_PREFERENCES.musicEnabled,
        });
      }
    } catch (error) {
      if (IS_DEV) console.warn('[UserStore] loadPreferences failed:', error);
    }
  },

  persistPreferences: async () => {
    try {
      const { soundEnabled, musicEnabled } = get();
      await storageService.setItem(StorageKeys.SETTINGS, { soundEnabled, musicEnabled });
    } catch (error) {
      if (IS_DEV) console.warn('[UserStore] persistPreferences failed:', error);
    }
  },
}));
