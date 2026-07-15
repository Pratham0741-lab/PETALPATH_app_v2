/**
 * useAuth
 *
 * Convenience hook exposing authentication state to components. Backed by the
 * AuthProvider context (which in turn reads the zustand appStore). Provides
 * login-state utilities without touching token storage directly.
 */
import { useAuthContext } from '../providers/AuthProvider';

export interface UseAuthResult {
  user: { id: string; email: string; name: string; role: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

export const useAuth = (): UseAuthResult => {
  const { user, token, isAuthenticated, isLoading, logout } = useAuthContext();
  return { user, token, isAuthenticated, isLoading, logout };
};
