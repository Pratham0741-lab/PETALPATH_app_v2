/**
 * Authentication infrastructure
 *
 * Reusable, framework-agnostic helpers for token storage and retrieval.
 * These mirror the keys used by the zustand appStore (src/store/appStore)
 * so they stay consistent with the persisted session, but they work outside
 * of React (e.g. inside the API client or background tasks).
 *
 * They do NOT implement authentication behavior — that is owned by the backend
 * and orchestrated by appStore + the API client's refresh flow.
 */
import { storage } from '../utils/storage';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

// Pragmatic email shape check — sufficient for client-side UX validation.
// Server-side validation remains the source of truth.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns true when the value looks like a valid email address. */
export const isValidEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Access token retrieval helper. */
export const getAccessToken = (): Promise<string | null> => storage.getItem(TOKEN_KEY);

/** Refresh token retrieval helper. */
export const getRefreshToken = (): Promise<string | null> => storage.getItem(REFRESH_TOKEN_KEY);

/** Persisted user profile retrieval helper. */
export const getStoredUser = async (): Promise<StoredUser | null> => {
  const raw = await storage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

/** True when a persisted access token exists. */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAccessToken();
  return !!token;
};

/** Removes all persisted auth artifacts (token, refresh token, user, active child). */
export const clearAuthTokens = async (): Promise<void> => {
  await storage.removeItem(TOKEN_KEY);
  await storage.removeItem(REFRESH_TOKEN_KEY);
  await storage.removeItem(USER_KEY);
  await storage.removeItem('activeChild');
};
