/**
 * App-side owner of the daily usage timer: one UsageTimer for all children,
 * persisted to the device so it survives the app being killed, restarted or
 * the phone rebooting. UsageLimitController drives start/pause/tick; screens
 * read `status` for the active child.
 */
import { create } from 'zustand';
import { storageService, StorageKeys } from '../../services/storage';
import { UsageTimer, systemClock, type UsageState, type UsageStatus } from './usageTimer';

/**
 * Screens whose time counts as learning: lessons, videos and activities. The
 * baseline questionnaire, parent area, profile, rewards and menus do not count.
 */
export const LEARNING_ROUTES: ReadonlySet<string> = new Set([
  'LessonOverview',
  'Lesson',
  'Video',
  'VideoCompleted',
  'Listen',
  'Speak',
  'Write',
  'LessonComplete',
  'Quiz',
  'Game',
  'Reading',
  'StoryReader',
  'CameraActivityLesson',
]);

/** While locked, the lock covers every screen except these grown-up ones. */
export const LOCK_EXEMPT_ROUTES: ReadonlySet<string> = new Set([
  'ChildSelection',
  'AddChild',
  'ParentConsent',
  'ParentProfile',
  'Login',
  'Register',
  'ForgotPassword',
  'ResetPassword',
]);

const SAVE_EVERY_MS = 5_000;

interface UsageStoreState {
  hydrated: boolean;
  /** Status of the child the controller last evaluated (the active child). */
  status: UsageStatus | null;
  hydrate: () => Promise<void>;
  /** Called by the controller on every change and about once a second. */
  refresh: (childId: string) => void;
  persist: () => Promise<void>;
  grantExtra: (childId: string) => Promise<void>;
  setLimit: (childId: string, minutes: number) => Promise<void>;
  setEnabled: (childId: string, enabled: boolean) => Promise<void>;
  /** Debug builds only (EXPO_PUBLIC_ENABLE_DEV_TOOLS): a 1-minute limit. */
  setDebugOneMinute: (childId: string) => Promise<void>;
  markWarned: (childId: string) => void;
  settings: (childId: string) => { limitMinutes: number; enabled: boolean };
}

export let usageTimer = new UsageTimer(systemClock);
let lastSave = 0;

export const useUsageStore = create<UsageStoreState>((set, get) => ({
  hydrated: false,
  status: null,

  hydrate: async () => {
    const saved = await storageService.getItem<UsageState>(StorageKeys.USAGE);
    usageTimer = new UsageTimer(systemClock, saved);
    set({ hydrated: true });
  },

  refresh: (childId) => {
    set({ status: usageTimer.status(childId) });
    const now = systemClock.monotonic();
    if (now - lastSave >= SAVE_EVERY_MS) {
      lastSave = now;
      void get().persist();
    }
  },

  persist: async () => {
    await storageService.setItem(StorageKeys.USAGE, usageTimer.snapshot()).catch(() => undefined);
  },

  grantExtra: async (childId) => {
    usageTimer.grantExtra(childId);
    set({ status: usageTimer.status(childId) });
    await get().persist();
  },

  setLimit: async (childId, minutes) => {
    usageTimer.setLimit(childId, minutes);
    set({ status: usageTimer.status(childId) });
    await get().persist();
  },

  setEnabled: async (childId, enabled) => {
    usageTimer.setEnabled(childId, enabled);
    set({ status: usageTimer.status(childId) });
    await get().persist();
  },

  setDebugOneMinute: async (childId) => {
    if (process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS !== 'true') return;
    usageTimer.setLimitUnchecked(childId, 1);
    set({ status: usageTimer.status(childId) });
    await get().persist();
  },

  markWarned: (childId) => {
    usageTimer.markWarned(childId);
    void get().persist();
  },

  settings: (childId) => usageTimer.settings(childId),
}));
