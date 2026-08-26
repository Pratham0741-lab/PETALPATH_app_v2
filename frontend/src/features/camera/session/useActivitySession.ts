import { useState, useRef, useCallback, useEffect } from 'react';
import { ActivitySessionEngine, SessionEngineSnapshot, SessionState } from './ActivitySessionEngine';
import { ActivityDefinition, getActivityDefinition } from './activityDefinitions';
import { ActivityType, ActivityEngineResult } from '../types/pose.types';

/**
 * @param initialActivityType Coarse activity type used when `startSession` is
 *   called without one.
 * @param initialActivityId The catalog id of the activity being played. Passing
 *   it is what lets the session use that activity's own reps and timings —
 *   without it "Clap three times" resolved to the `clap` entry and asked for one.
 */
export function useActivitySession(
  initialActivityType: ActivityType = 'raise_hands',
  initialActivityId?: string,
) {
  const engineRef = useRef<ActivitySessionEngine>(new ActivitySessionEngine());
  const [snapshot, setSnapshot] = useState<SessionEngineSnapshot>(
    engineRef.current.getSnapshot(),
  );

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateSnapshot = useCallback(() => {
    setSnapshot(engineRef.current.getSnapshot());
  }, []);

  const startSession = useCallback(
    (activityType: ActivityType = initialActivityType, countdownSec = 3, activityId?: string) => {
      const def = getActivityDefinition(activityType, activityId ?? initialActivityId);
      engineRef.current.startSession(def, countdownSec);
      updateSnapshot();

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        engineRef.current.tickCountdown();
        updateSnapshot();
        if (engineRef.current.getSnapshot().state !== 'starting') {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        }
      }, 1000);
    },
    [initialActivityType, initialActivityId, updateSnapshot],
  );

  const processFrameResult = useCallback(
    (evalResult: ActivityEngineResult) => {
      engineRef.current.evaluateFrame(evalResult);
      updateSnapshot();
    },
    [updateSnapshot],
  );

  const pauseSession = useCallback(() => {
    engineRef.current.pauseSession();
    updateSnapshot();
  }, [updateSnapshot]);

  const resumeSession = useCallback(() => {
    engineRef.current.resumeSession();
    updateSnapshot();
  }, [updateSnapshot]);

  const cancelSession = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    engineRef.current.cancelSession();
    updateSnapshot();
  }, [updateSnapshot]);

  const resetSession = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    engineRef.current.resetSession();
    updateSnapshot();
  }, [updateSnapshot]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  return {
    snapshot,
    sessionState: snapshot.state,
    startSession,
    processFrameResult,
    pauseSession,
    resumeSession,
    cancelSession,
    resetSession,
  };
}
