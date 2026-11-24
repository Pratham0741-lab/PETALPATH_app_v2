/**
 * What this device keeps about a child or an account, and wiping it after the
 * server has confirmed a deletion.
 *
 * Device storage (as of this change):
 *  - SecureStore: auth and refresh tokens, the signed-in user (storageService's
 *    secure keys).
 *  - AsyncStorage: legacy token/user copies (utils/storage), active child and
 *    children list, settings, consent records, baseline answers per child,
 *    usage minutes per child, tracing progress per child, the offline request
 *    queue (progress, completions and lesson feedback waiting to be sent), the
 *    camera completion queue, camera calibration and difficulty, theme,
 *    remembered email.
 *  - Memory: the zustand stores and the TanStack Query cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import { StorageKeys } from '../../services/storage/storageKeys';
import { storageService } from '../../services/storage';
import { offlineQueue } from '../../services/offline/offlineQueue';
import { offlineQueue as cameraQueue } from '../camera/progress/offlineQueue';
import { useAppStore } from '../../store/appStore';
import { useChildStore } from '../../store/childStore';
import { useBaselineStore } from '../baseline/baselineStore';
import { useUsageStore } from '../usageLimit/usageStore';
import { useProgressStore } from '../../store/progressStore';
import { useRewardsStore } from '../../store/rewardsStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useWriteStore } from '../../store/writeStore';
import { useListenStore } from '../../store/listenStore';
import { useSpeakStore } from '../../store/speakStore';
import { useVideoStore } from '../../store/videoStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useUserStore } from '../../store/userStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { mentionsChild, withoutChild } from './deletionFlow';
import type { UsageState } from '../usageLimit/usageTimer';

/** Legacy copies written by utils/storage alongside storageService's keys. */
const LEGACY_KEYS = ['token', 'refreshToken', 'user', 'activeChild', 'parentNameSkipped'];

interface ResettableStore {
  getInitialState: () => unknown;
  setState: (state: never, replace: true) => void;
}

/** In-memory stores that can hold a child's or the parent's data. */
const DATA_STORES: readonly ResettableStore[] = [
  useBaselineStore,
  useUsageStore,
  useProgressStore,
  useRewardsStore,
  useRoadmapStore,
  useWriteStore,
  useListenStore,
  useSpeakStore,
  useVideoStore,
  useNotificationStore,
  useUserStore,
  useSettingsStore,
  useTutorialStore,
] as unknown as readonly ResettableStore[];

/**
 * After the account is deleted: sign out, then remove everything this device
 * holds. Each step runs even if an earlier one fails.
 */
export async function wipeDevice(queryClient: QueryClient): Promise<void> {
  const steps: (() => Promise<unknown> | unknown)[] = [
    // Signed-out state first, so the app leaves the signed-in screens at once.
    () => useAppStore.getState().clearSession(),
    () => queryClient.cancelQueries(),
    () => queryClient.clear(),
    () => offlineQueue.clear(),
    () => cameraQueue.clear(),
    ...DATA_STORES.map((store) => () => store.setState(store.getInitialState() as never, true)),
    () => useChildStore.setState({ activeChild: null, childrenList: [] }),
    async () => {
      if (Platform.OS === 'web') return;
      const keys = [...Object.values(StorageKeys), ...LEGACY_KEYS];
      for (const key of keys) await SecureStore.deleteItemAsync(key).catch(() => undefined);
    },
    () => AsyncStorage.clear(),
  ];
  for (const step of steps) {
    try {
      await step();
    } catch {
      /* keep going: every other step still runs */
    }
  }
}

/** After one child is deleted: remove what this device keeps about them. */
export async function forgetChildLocally(childId: string, queryClient: QueryClient): Promise<void> {
  const steps: (() => Promise<unknown>)[] = [
    // Requests waiting to be sent for this child (progress, feedback, ...).
    async () => {
      for (const item of await offlineQueue.getAll()) {
        if (mentionsChild(item, childId)) await offlineQueue.remove(item.id);
      }
    },
    // Camera completions carry no child id; they belong to the active child.
    async () => {
      if (useChildStore.getState().activeChild?.id === childId) await cameraQueue.clear();
    },
    async () => {
      const byChild = withoutChild(useBaselineStore.getState().byChild, childId);
      useBaselineStore.setState({ byChild });
      await storageService.setItem(StorageKeys.BASELINE, byChild);
    },
    async () => {
      const usage = await storageService.getItem<UsageState>(StorageKeys.USAGE);
      if (usage?.children) {
        await storageService.setItem(StorageKeys.USAGE, { ...usage, children: withoutChild(usage.children, childId) });
        await useUsageStore.getState().hydrate(); // rebuild the timer without the child
      }
    },
    async () => {
      const traces = await storageService.getItem<Record<string, unknown>>(StorageKeys.TRACE_PROGRESS);
      if (traces) {
        const kept = Object.fromEntries(Object.entries(traces).filter(([k]) => !k.startsWith(`${childId}:`)));
        await storageService.setItem(StorageKeys.TRACE_PROGRESS, kept);
      }
    },
    async () => queryClient.clear(),
  ];
  for (const step of steps) await step().catch(() => undefined);
}

/**
 * After a child is deleted: unselect the active child, which takes the app back
 * to the profile list (RootNavigator shows it whenever no child is selected),
 * and reload that list.
 */
export async function refreshProfilesAfterDeletion(): Promise<void> {
  const store = useChildStore.getState();
  await store.setActiveChild(null);
  await store.refreshChildren();
}
