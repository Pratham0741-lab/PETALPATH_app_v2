import { create } from 'zustand';
import { api } from '../api/client';
import { useAppStore } from './appStore';
import { storage } from '../utils/storage';

export interface Child {
  id: string;
  userId: string;
  name: string;
  age: number;
  ageGroup: string;
  avatar: string;
  mentorId: string | null;
  mentor?: {
    id: string;
    name: string;
    characterType: string;
    personality: string;
    voiceStyle: string;
    description: string;
    imagePath: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ChildState {
  activeChild: Child | null;
  childrenList: Child[];
  loading: boolean;
  error: string | null;
  
  setActiveChild: (child: Child | null) => Promise<void>;
  refreshChildren: () => Promise<void>;
  addChild: (data: { name: string; age: number; avatar: string; mentorId?: string | null }) => Promise<Child>;
  updateChild: (id: string, data: { name?: string; age?: number; avatar?: string; mentorId?: string | null }) => Promise<Child>;
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
        const response = await api.post('/auth/select-child', { childId: child.id });
        if (response.success && response.data.accessToken) {
          await useAppStore.getState().setToken(response.data.accessToken);
        }
      } catch (err) {
        console.warn('Failed to register child selection with backend:', err);
      }
      await storage.setItem('activeChild', JSON.stringify(child));
      
      // Hydrate rewards and progress stores with the selected child's stats
      try {
        const { useRewardsStore } = await import('./rewardsStore');
        const { useProgressStore } = await import('./progressStore');
        await Promise.all([
          useRewardsStore.getState().refreshRewards(),
          useProgressStore.getState().refreshProgress(),
        ]);
      } catch (err) {
        console.warn('Failed to sync child stores:', err);
      }
    } else {
      await storage.removeItem('activeChild');
    }
    set({ activeChild: child });
  },

  refreshChildren: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/children');
      const children = response.data || [];
      set({ childrenList: children });

      // If there is a currently selected active child, refresh its info
      const currentActive = get().activeChild;
      let resolved: Child | null = null;
      if (currentActive) {
        const updatedActive = children.find((c: Child) => c.id === currentActive.id);
        resolved = updatedActive || children[0] || null;
      } else if (children.length > 0) {
        resolved = children[0];
      }

      if (resolved) {
        // If the child resolved differs from what was active, select it via setActiveChild
        // to update the backend JWT token. Otherwise, just update local state.
        if (!currentActive || currentActive.id !== resolved.id) {
          await get().setActiveChild(resolved);
        } else {
          set({ activeChild: resolved });
          await storage.setItem('activeChild', JSON.stringify(resolved));
        }
      } else {
        await get().setActiveChild(null);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch children list' });
    } finally {
      set({ loading: false });
    }
  },

  addChild: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/children', data);
      const child = response.data;
      
      // Refresh child list and select active child
      await get().refreshChildren();
      
      return child;
    } catch (err: any) {
      set({ error: err.message || 'Failed to add child' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateChild: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/children/${id}`, data);
      const child = response.data;
      
      // Refresh list to sync modifications
      await get().refreshChildren();
      
      return child;
    } catch (err: any) {
      set({ error: err.message || 'Failed to update child profile' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  removeChild: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/children/${id}`);
      
      const currentActive = get().activeChild;
      if (currentActive && currentActive.id === id) {
        set({ activeChild: null });
      }
      
      await get().refreshChildren();
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete child profile' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
