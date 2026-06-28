/**
 * useInactivityTimer
 *
 * Custom hook that detects user inactivity and triggers tutorial replay.
 * - Starts a 10-second timer on mount
 * - Resets on any user interaction (via resetInactivity)
 * - On expiry: calls tutorialStore.handleInactivity
 * - Max 3 retries before stopping
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTutorialStore } from '../store/tutorialStore';

/**
 * @param screenKey - Unique identifier for the current screen
 * @param timeoutMs - Inactivity timeout in milliseconds (default: 10000)
 */
export const useInactivityTimer = (
  screenKey: string,
  timeoutMs: number = 10000,
): { resetTimer: () => void } => {
  const {
    enabled,
    handleInactivity,
    resetInactivity,
    inactivityCount,
  } = useTutorialStore();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (!enabled || inactivityCount >= 3) return;

    timerRef.current = setTimeout(() => {
      handleInactivity(screenKey);
    }, timeoutMs);
  }, [enabled, inactivityCount, screenKey, timeoutMs, handleInactivity, clearTimer]);

  const resetTimer = useCallback(() => {
    resetInactivity();
    startTimer();
  }, [resetInactivity, startTimer]);

  // Start timer on mount, clean up on unmount
  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  // Restart timer when inactivity count changes (after a replay)
  useEffect(() => {
    if (inactivityCount > 0 && inactivityCount < 3) {
      startTimer();
    }
  }, [inactivityCount, startTimer]);

  return { resetTimer };
};
