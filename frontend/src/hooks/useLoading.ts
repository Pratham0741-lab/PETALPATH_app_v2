/**
 * useLoading
 *
 * Simple boolean loading-state helper for components that manage their own
 * async work (e.g. a button spinner during a request). Framework-agnostic.
 */
import { useCallback, useState } from 'react';

export interface UseLoadingResult {
  isLoading: boolean;
  show: () => void;
  hide: () => void;
  toggle: (value: boolean) => void;
}

export const useLoading = (initial = false): UseLoadingResult => {
  const [isLoading, setIsLoading] = useState<boolean>(initial);

  const show = useCallback(() => setIsLoading(true), []);
  const hide = useCallback(() => setIsLoading(false), []);
  const toggle = useCallback((value: boolean) => setIsLoading(value), []);

  return { isLoading, show, hide, toggle };
};
