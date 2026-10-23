/**
 * Baseline questionnaire state, per child, stored on the device first.
 *
 * Status drives the app: while a child's baseline is `pending`, `in_progress`
 * or `result`, RootNavigator shows the questionnaire instead of the Learning
 * Journey — which is what makes it start right after profile creation and
 * resume from the last answered item after the app is closed. The answers
 * alone determine the next item (see engine.ts), so resuming needs nothing
 * else.
 *
 * The finished (or skipped) baseline is then POSTed to
 * /children/:childId/baseline. That endpoint checks the token's active child,
 * so a record is only sent while its child is active; until then it stays
 * `synced: false` and is retried on launch, on child switch and when the
 * device comes back online.
 */
import { create } from 'zustand';
import { apiClient } from '../../services/api/apiClient';
import { storageService, StorageKeys } from '../../services/storage';
import { IS_DEV } from '../../config/api';
import type { ApiResponse } from '../../types/api';
import bankJson from './assessment_items.json';
import { buildBaseline, skippedBaseline } from './engine';
import type { Answer, Baseline, BaselineGrade, ItemBank } from './types';

export const ITEM_BANK = bankJson as unknown as ItemBank;

export type BaselineStatus = 'pending' | 'in_progress' | 'result' | 'done' | 'skipped';

export interface ChildBaselineState {
  status: BaselineStatus;
  grade: BaselineGrade;
  answers: Answer[];
  baseline: Baseline | null;
  synced: boolean;
}

interface BaselineStoreState {
  byChild: Record<string, ChildBaselineState>;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  /** A new profile: the questionnaire should run for this child. */
  markPending: (childId: string, grade: BaselineGrade) => Promise<void>;
  start: (childId: string) => Promise<void>;
  answer: (childId: string, answer: Answer) => Promise<void>;
  complete: (childId: string) => Promise<void>;
  /** The parent has seen the result screen: on to the Learning Journey. */
  acknowledge: (childId: string) => Promise<void>;
  skip: (childId: string, grade: BaselineGrade) => Promise<void>;
  /** Sends the active child's unsynced baseline, and learns of one saved on another device. */
  sync: (activeChildId: string) => Promise<void>;
}

/** Statuses during which the questionnaire replaces the rest of the app. */
export const BASELINE_ACTIVE: ReadonlySet<BaselineStatus> = new Set(['pending', 'in_progress', 'result']);

export const useBaselineStore = create<BaselineStoreState>((set, get) => {
  const save = async (byChild: Record<string, ChildBaselineState>) => {
    set({ byChild });
    await storageService.setItem(StorageKeys.BASELINE, byChild).catch(() => undefined);
  };

  const update = async (childId: string, patch: Partial<ChildBaselineState>) => {
    const current = get().byChild[childId];
    if (!current) return;
    await save({ ...get().byChild, [childId]: { ...current, ...patch } });
  };

  return {
    byChild: {},
    hydrated: false,

    hydrate: async () => {
      const stored = await storageService.getItem<Record<string, ChildBaselineState>>(StorageKeys.BASELINE);
      set({ byChild: stored && typeof stored === 'object' ? stored : {}, hydrated: true });
    },

    markPending: async (childId, grade) => {
      if (get().byChild[childId]) return; // runs once per child
      await save({
        ...get().byChild,
        [childId]: { status: 'pending', grade, answers: [], baseline: null, synced: false },
      });
    },

    start: async (childId) => {
      const s = get().byChild[childId];
      if (s?.status === 'pending') await update(childId, { status: 'in_progress' });
    },

    answer: async (childId, answer) => {
      const s = get().byChild[childId];
      if (!s || s.status !== 'in_progress') return;
      if (s.answers.some((a) => a.itemId === answer.itemId)) return; // double tap
      await update(childId, { answers: [...s.answers, answer] });
    },

    complete: async (childId) => {
      const s = get().byChild[childId];
      if (!s || s.status !== 'in_progress') return;
      const baseline = buildBaseline(childId, s.grade, s.answers, new Date());
      await update(childId, { status: 'result', baseline, synced: false });
      void get().sync(childId);
    },

    acknowledge: async (childId) => {
      if (get().byChild[childId]?.status === 'result') await update(childId, { status: 'done' });
    },

    skip: async (childId, grade) => {
      const existing = get().byChild[childId];
      const baseline = skippedBaseline(childId, existing?.grade ?? grade, new Date());
      await save({
        ...get().byChild,
        [childId]: { status: 'skipped', grade: baseline.grade, answers: existing?.answers ?? [], baseline, synced: false },
      });
      void get().sync(childId);
    },

    sync: async (activeChildId) => {
      const s = get().byChild[activeChildId];
      try {
        if (s?.baseline && !s.synced) {
          await apiClient.post(`/children/${activeChildId}/baseline`, s.baseline);
          await update(activeChildId, { synced: true });
          return;
        }
        if (!s || !BASELINE_ACTIVE.has(s.status)) {
          // Reinstall / another device: a baseline already on the server means
          // the questionnaire has run for this child — never ask again.
          const res = await apiClient.get<ApiResponse<Baseline | null>>(`/children/${activeChildId}/baseline`);
          const remote = res.data;
          if (remote && !s) {
            await save({
              ...get().byChild,
              [activeChildId]: {
                status: remote.skipped ? 'skipped' : 'done',
                grade: remote.grade,
                answers: [],
                baseline: remote,
                synced: true,
              },
            });
          }
        }
      } catch (err) {
        // Offline or server error: kept locally, retried on the next trigger.
        if (IS_DEV) console.warn('[baseline] sync deferred:', err instanceof Error ? err.message : err);
      }
    },
  };
});
