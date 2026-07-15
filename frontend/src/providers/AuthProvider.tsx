/**
 * Auth Provider
 *
 * Thin React context over the existing zustand auth store (appStore).
 * It does not duplicate token storage — that lives in appStore + AsyncStorage.
 * It simply exposes auth state to the component tree and guarantees the
 * persisted session is hydrated on app launch.
 *
 * Feature code should prefer the `useAuth` hook (src/hooks/useAuth) which
 * reads from this context.
 */
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: AppUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const loadingSession = useAppStore((s) => s.loadingSession);
  const loadSession = useAppStore((s) => s.loadSession);
  const clearSession = useAppStore((s) => s.clearSession);

  // Hydrate persisted session once on mount.
  useEffect(() => {
    if (loadingSession) {
      loadSession();
    }
  }, [loadingSession, loadSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      isLoading: loadingSession,
      logout: clearSession,
    }),
    [user, token, loadingSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an <AuthProvider>');
  }
  return ctx;
}
