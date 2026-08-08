/**
 * Shared Session State & Timer — PetalPath Core Activity Runtime
 */

export interface SessionState {
  activityId: string | null;
  startTime: number | null;
  endTime: number | null;
  elapsedMs: number;
  isPaused: boolean;
  isCompleted: boolean;
}

export function createInitialSessionState(activityId: string | null = null): SessionState {
  return {
    activityId,
    startTime: null,
    endTime: null,
    elapsedMs: 0,
    isPaused: false,
    isCompleted: false,
  };
}
