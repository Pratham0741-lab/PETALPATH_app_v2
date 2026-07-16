import { create } from 'zustand';
import { IS_DEV } from '../config/api';
import { authService } from '../services/auth/authService';
import { storageService, StorageKeys } from '../services/storage';
import type { User, Session } from '../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: Session) => Promise<void>;
  hydrateSession: () => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const authResponse = await authService.login(email, password);
      set({
        user: authResponse.user,
        token: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      if (IS_DEV) console.warn('[AuthStore] login failed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const authResponse = await authService.register(name, email, password);
      set({
        user: authResponse.user,
        token: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      if (IS_DEV) console.warn('[AuthStore] register failed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (error) {
      if (IS_DEV) console.warn('[AuthStore] logout API call failed:', error);
    }
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setSession: async (session: Session) => {
    try {
      await Promise.all([
        storageService.setItem(StorageKeys.AUTH_TOKEN, session.accessToken),
        storageService.setItem(StorageKeys.REFRESH_TOKEN, session.refreshToken),
        storageService.setItem<User>(StorageKeys.USER, session.user),
      ]);
      set({
        user: session.user,
        token: session.accessToken,
        refreshToken: session.refreshToken,
        isAuthenticated: true,
      });
    } catch (error) {
      if (IS_DEV) console.warn('[AuthStore] setSession failed:', error);
      throw error;
    }
  },

  hydrateSession: async () => {
    set({ isLoading: true });
    try {
      const [token, refreshToken, user] = await Promise.all([
        storageService.getItem<string>(StorageKeys.AUTH_TOKEN),
        storageService.getItem<string>(StorageKeys.REFRESH_TOKEN),
        storageService.getItem<User>(StorageKeys.USER),
      ]);

      if (token && refreshToken && user) {
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      if (IS_DEV) console.warn('[AuthStore] hydrateSession failed:', error);
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearSession: async () => {
    try {
      await Promise.all([
        storageService.removeItem(StorageKeys.AUTH_TOKEN),
        storageService.removeItem(StorageKeys.REFRESH_TOKEN),
        storageService.removeItem(StorageKeys.USER),
      ]);
    } catch (error) {
      if (IS_DEV) console.warn('[AuthStore] clearSession failed:', error);
    }
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
