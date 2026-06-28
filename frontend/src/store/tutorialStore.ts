/**
 * Tutorial Store
 *
 * Manages all tutorial/guide state including:
 * - Voice guidance enabled/disabled
 * - Current tutorial playback
 * - First-time tutorial tracking (persisted)
 * - Inactivity recovery
 * - Accessibility settings
 */

import { create } from 'zustand';
import { storage } from '../utils/storage';
import { useChildStore } from './childStore';
import { GuideKey } from '../constants/audioGuideMap';
import * as audioGuideService from '../services/audioGuideService';

// ---------- Storage Keys ----------

const STORAGE_KEY_SEEN = 'tutorial_seen';
const STORAGE_KEY_SETTINGS = 'tutorial_settings';

// ---------- Types ----------

interface TutorialSettings {
  enabled: boolean;
  volume: number;
  animationsEnabled: boolean;
  reduceMotion: boolean;
}

interface TutorialState extends TutorialSettings {
  // Playback state
  currentGuideKey: GuideKey | null;
  isPlaying: boolean;

  // First-time tracking
  seenTutorials: Record<string, boolean>;

  // Inactivity
  inactivityCount: number;
  interactionTimestamp: number;

  // Actions
  playTutorial: (guideKey: GuideKey, onFinished?: () => void) => void;
  stopTutorial: () => void;
  skipTutorial: (screenKey: string) => void;
  replayTutorial: () => void;
  markSeen: (screenKey: string) => void;
  hasSeen: (screenKey: string) => boolean;
  handleInactivity: (screenKey: string) => void;
  resetInactivity: () => void;
  recordInteraction: () => void;
  toggleGuide: () => void;
  setVolume: (value: number) => void;
  setReduceMotion: (value: boolean) => void;
  setAnimationsEnabled: (value: boolean) => void;
  loadSettings: () => Promise<void>;
}

// ---------- Helpers ----------

const getActiveMentorType = (): string => {
  const child = useChildStore.getState().activeChild;
  return child?.mentor?.characterType || 'panda';
};

const persistSettings = async (settings: TutorialSettings): Promise<void> => {
  try {
    await storage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn('[TutorialStore] Failed to persist settings:', err);
  }
};

const persistSeenTutorials = async (seen: Record<string, boolean>): Promise<void> => {
  try {
    await storage.setItem(STORAGE_KEY_SEEN, JSON.stringify(seen));
  } catch (err) {
    console.warn('[TutorialStore] Failed to persist seen tutorials:', err);
  }
};

// ---------- Store ----------

export const useTutorialStore = create<TutorialState>((set, get) => ({
  // Default settings
  enabled: true,
  volume: 0.8,
  animationsEnabled: true,
  reduceMotion: false,

  // Playback state
  currentGuideKey: null,
  isPlaying: false,

  // First-time tracking
  seenTutorials: {},

  // Inactivity
  inactivityCount: 0,
  interactionTimestamp: 0,

  // ---------- Actions ----------

  playTutorial: (guideKey, onFinished) => {
    const state = get();
    if (!state.enabled) {
      onFinished?.();
      return;
    }

    const characterType = getActiveMentorType();

    set({ currentGuideKey: guideKey, isPlaying: true, inactivityCount: 0 });

    audioGuideService.playGuide(characterType, guideKey, () => {
      set({ isPlaying: false });
      onFinished?.();
    });

    console.log(`[Tutorial] Started: ${guideKey}`);
  },

  stopTutorial: () => {
    audioGuideService.stopGuide();
    set({ isPlaying: false });
    console.log('[Tutorial] Stopped');
  },

  skipTutorial: (screenKey) => {
    const state = get();
    audioGuideService.stopGuide();

    const updated = { ...state.seenTutorials, [screenKey]: true };
    set({ isPlaying: false, seenTutorials: updated });
    persistSeenTutorials(updated);

    console.log(`[Tutorial] Skipped & marked seen: ${screenKey}`);
  },

  replayTutorial: () => {
    const state = get();
    if (!state.enabled) return;

    set({ isPlaying: true, inactivityCount: 0 });

    audioGuideService.replayGuide(() => {
      set({ isPlaying: false });
    });

    console.log('[Tutorial] Replayed');
  },

  markSeen: (screenKey) => {
    const state = get();
    const updated = { ...state.seenTutorials, [screenKey]: true };
    set({ seenTutorials: updated });
    persistSeenTutorials(updated);
    console.log(`[Tutorial] Marked seen: ${screenKey}`);
  },

  hasSeen: (screenKey) => {
    return get().seenTutorials[screenKey] === true;
  },

  handleInactivity: (screenKey) => {
    const state = get();
    if (!state.enabled) return;
    if (state.inactivityCount >= 3) {
      console.log('[Tutorial] Max inactivity retries reached');
      return;
    }

    const newCount = state.inactivityCount + 1;
    set({ inactivityCount: newCount, isPlaying: true });

    audioGuideService.replayGuide(() => {
      set({ isPlaying: false });
    });

    console.log(`[Tutorial] Inactivity replay #${newCount} for ${screenKey}`);
  },

  resetInactivity: () => {
    set({ inactivityCount: 0 });
  },

  recordInteraction: () => {
    set({ interactionTimestamp: Date.now() });
  },

  toggleGuide: () => {
    const state = get();
    const newEnabled = !state.enabled;

    if (!newEnabled) {
      audioGuideService.stopGuide();
      set({ enabled: newEnabled, isPlaying: false });
    } else {
      set({ enabled: newEnabled });
    }

    persistSettings({
      enabled: newEnabled,
      volume: state.volume,
      animationsEnabled: state.animationsEnabled,
      reduceMotion: state.reduceMotion,
    });

    console.log(`[Tutorial] Guide ${newEnabled ? 'enabled' : 'disabled'}`);
  },

  setVolume: (value) => {
    const clamped = Math.max(0, Math.min(1, value));
    audioGuideService.setGuideVolume(clamped);
    set({ volume: clamped });

    const state = get();
    persistSettings({
      enabled: state.enabled,
      volume: clamped,
      animationsEnabled: state.animationsEnabled,
      reduceMotion: state.reduceMotion,
    });
  },

  setReduceMotion: (value) => {
    set({ reduceMotion: value });
    const state = get();
    persistSettings({
      enabled: state.enabled,
      volume: state.volume,
      animationsEnabled: state.animationsEnabled,
      reduceMotion: value,
    });
  },

  setAnimationsEnabled: (value) => {
    set({ animationsEnabled: value });
    const state = get();
    persistSettings({
      enabled: state.enabled,
      volume: state.volume,
      animationsEnabled: value,
      reduceMotion: state.reduceMotion,
    });
  },

  loadSettings: async () => {
    try {
      const settingsRaw = await storage.getItem(STORAGE_KEY_SETTINGS);
      if (settingsRaw) {
        const settings: TutorialSettings = JSON.parse(settingsRaw);
        set({
          enabled: settings.enabled ?? true,
          volume: settings.volume ?? 0.8,
          animationsEnabled: settings.animationsEnabled ?? true,
          reduceMotion: settings.reduceMotion ?? false,
        });
        audioGuideService.setGuideVolume(settings.volume ?? 0.8);
      }
    } catch (err) {
      console.warn('[TutorialStore] Failed to load settings:', err);
    }

    try {
      const seenRaw = await storage.getItem(STORAGE_KEY_SEEN);
      if (seenRaw) {
        set({ seenTutorials: JSON.parse(seenRaw) });
      }
    } catch (err) {
      console.warn('[TutorialStore] Failed to load seen tutorials:', err);
    }

    console.log('[TutorialStore] Settings loaded');
  },
}));
