import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Lightweight, dependency-free network connectivity detection.
 *
 * - Web: listens to the browser's `online`/`offline` events and reads the
 *   initial `navigator.onLine` state.
 * - Native: React Native exposes no built-in connectivity API without an extra
 *   dependency (e.g. @react-native-community/netinfo), which this project does
 *   not include. We therefore assume connectivity on native and rely on
 *   per-request error handling (ApiError / NetworkError) for failures.
 *
 * This intentionally avoids introducing a heavy dependency (see phase rules).
 */
export function useNetworkStatus(): { isOnline: boolean; isOffline: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Reconcile in case connectivity changed during mount.
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}
