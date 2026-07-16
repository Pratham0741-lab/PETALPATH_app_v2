import { create } from 'zustand';
import { IS_DEV } from '../config/api';
import { apiClient } from '../services/api/apiClient';
import { storageService, StorageKeys } from '../services/storage';
import { useAppStore } from './appStore';
import type { Child, ChildFormData } from '../types/child';
import type { ApiResponse } from '../types/api';

export type { Child, ChildFormData };

interface ChildState {
  activeChild: Child | null;
  childrenList: Child[];
  loading: boolean;
  error: string | null;

  setActiveChild: (child: Child | null) => Promise<void>;
  refreshChildren: () => Promise<void>;
  addChild: (data: ChildFormData) => Promise<Child>;
  updateChild: (id: string, data: Partial<ChildFormData>) => Promise<Child>;
  removeChild: (id: string) => Promise<void>;
}

export const useChildStore = create<ChildState>((set, get) => ({
  activeChild: null,
  childrenList: [],
  loading: false,
  error: null,

  setActiveChild: async (child) => {
    if (child) {
      try {
        const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/select-child', { childId: child.id });
        if (response.success && response.data) {
          await useAppStore.getState().setToken(response.data.accessToken);
        }
      } catch (err) {
        if (IS_DEV) console.warn('Failed to register child selection with backend:', err);
      }
      await storageService.setItem(StorageKeys.ACTIVE_CHILD, child);

      try {
        const { useRewardsStore } = await import('./rewardsStore');
        const { useProgressStore } = await import('./progressStore');
        await Promise.all([
          useRewardsStore.getState().refreshRewards(),
          useProgressStore.getState().refreshProgress(),
        ]);
      } catch (err) {
        if (IS_DEV) console.warn('Failed to sync child stores:', err);
      }
    } else {
      await storageService.removeItem(StorageKeys.ACTIVE_CHILD);
    }
    set({ activeChild: child });
  },

  refreshChildren: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      const children = response.data ?? [];
      set({ childrenList: children });

      const currentActive = get().activeChild;
      let resolved: Child | null = null;
      if (currentActive) {
        const updatedActive = children.find((c: Child) => c.id === currentActive.id);
        resolved = updatedActive ?? children[0] ?? null;
      } else if (children.length > 0) {
        resolved = children[0];
      }

      if (resolved) {
        if (!currentActive || currentActive.id !== resolved.id) {
          await get().setActiveChild(resolved);
        } else {
          set({ activeChild: resolved });
          await storageService.setItem(StorageKeys.ACTIVE_CHILD, resolved);
        }
      } else {
        await get().setActiveChild(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch children list';
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },

  addChild: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post<ApiResponse<Child>>('/children', data);

      if (!response.data) {
        throw new Error('No child data returned from server');
      }

      await get().refreshChildren();

      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add child';
      set({ error: message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateChild: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put<ApiResponse<Child>>(`/children/${id}`, data);

      if (!response.data) {
        throw new Error('No child data returned from server');
      }

      await get().refreshChildren();

      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update child profile';
      set({ error: message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  removeChild: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete<ApiResponse<void>>(`/children/${id}`);

      const currentActive = get().activeChild;
      if (currentActive && currentActive.id === id) {
        set({ activeChild: null });
      }

      await get().refreshChildren();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete child profile';
      set({ error: message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
