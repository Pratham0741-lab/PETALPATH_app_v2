import { create } from 'zustand';
import { IS_DEV } from '../config/api';
import { storageService, StorageKeys } from '../services/storage';

interface TutorialState {
  hasSeenTutorial: boolean;
  tutorialSkipped: boolean;
}

interface SettingsState {
  onboardingComplete: boolean;
  hasSeenTutorial: boolean;
  tutorialSkipped: boolean;

  setOnboardingComplete: (complete: boolean) => void;
  setHasSeenTutorial: (seen: boolean) => void;
  setTutorialSkipped: (skipped: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  onboardingComplete: false,
  hasSeenTutorial: false,
  tutorialSkipped: false,

  setOnboardingComplete: (complete: boolean) => {
    set({ onboardingComplete: complete });
    storageService.setItem(StorageKeys.ONBOARDING_COMPLETE, complete).catch((error) => {
      if (IS_DEV) console.warn('[SettingsStore] persist onboardingComplete failed:', error);
    });
  },

  setHasSeenTutorial: (seen: boolean) => {
    set({ hasSeenTutorial: seen });
    persistTutorialState();
  },

  setTutorialSkipped: (skipped: boolean) => {
    set({ tutorialSkipped: skipped });
    persistTutorialState();
  },

  hydrate: async () => {
    try {
      const [onboardingComplete, tutorialState] = await Promise.all([
        storageService.getItem<boolean>(StorageKeys.ONBOARDING_COMPLETE),
        storageService.getItem<TutorialState>(StorageKeys.SETTINGS),
      ]);

      set({
        onboardingComplete: onboardingComplete ?? false,
        hasSeenTutorial: tutorialState?.hasSeenTutorial ?? false,
        tutorialSkipped: tutorialState?.tutorialSkipped ?? false,
      });
    } catch (error) {
      if (IS_DEV) console.warn('[SettingsStore] hydrate failed:', error);
    }
  },
}));

async function persistTutorialState(): Promise<void> {
  try {
    const { hasSeenTutorial, tutorialSkipped } = useSettingsStore.getState();
    const existing = await storageService.getItem<Record<string, unknown>>(StorageKeys.SETTINGS);
    const merged = {
      ...(existing ?? {}),
      hasSeenTutorial,
      tutorialSkipped,
    };
    await storageService.setItem(StorageKeys.SETTINGS, merged);
  } catch (error) {
    if (IS_DEV) console.warn('[SettingsStore] persist tutorial state failed:', error);
  }
}
