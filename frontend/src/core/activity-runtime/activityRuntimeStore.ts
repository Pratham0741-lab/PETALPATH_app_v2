/**
 * Unified Activity Runtime Store — PetalPath Core State Management
 */

import { create } from 'zustand';
import { SessionState, createInitialSessionState } from './SessionState';
import { InteractionState, createInitialInteractionState } from './InteractionState';

export interface ActivityRuntimeStore {
  session: SessionState;
  interaction: InteractionState;
  engineState: Record<string, any>;

  startSession: (activityId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  recordAttempt: (isCorrect: boolean) => void;
  incrementHintCount: () => void;
  setEngineState: (key: string, value: any) => void;
  resetRuntime: () => void;
}

export const useActivityRuntimeStore = create<ActivityRuntimeStore>((set, get) => ({
  session: createInitialSessionState(),
  interaction: createInitialInteractionState(),
  engineState: {},

  startSession: (activityId: string) => {
    set({
      session: {
        activityId,
        startTime: Date.now(),
        endTime: null,
        elapsedMs: 0,
        isPaused: false,
        isCompleted: false,
      },
      interaction: createInitialInteractionState(),
      engineState: {},
    });
  },

  pauseSession: () => {
    set((state) => ({
      session: { ...state.session, isPaused: true },
    }));
  },

  resumeSession: () => {
    set((state) => ({
      session: { ...state.session, isPaused: false },
    }));
  },

  completeSession: () => {
    const now = Date.now();
    set((state) => ({
      session: {
        ...state.session,
        endTime: now,
        elapsedMs: state.session.startTime ? now - state.session.startTime : 0,
        isCompleted: true,
      },
    }));
  },

  recordAttempt: (isCorrect: boolean) => {
    set((state) => ({
      interaction: {
        ...state.interaction,
        attempts: state.interaction.attempts + 1,
        correctCount: isCorrect ? state.interaction.correctCount + 1 : state.interaction.correctCount,
        incorrectCount: !isCorrect ? state.interaction.incorrectCount + 1 : state.interaction.incorrectCount,
        lastInteractionTime: Date.now(),
      },
    }));
  },

  incrementHintCount: () => {
    set((state) => ({
      interaction: {
        ...state.interaction,
        hintUsageCount: state.interaction.hintUsageCount + 1,
      },
    }));
  },

  setEngineState: (key: string, value: any) => {
    set((state) => ({
      engineState: { ...state.engineState, [key]: value },
    }));
  },

  resetRuntime: () => {
    set({
      session: createInitialSessionState(),
      interaction: createInitialInteractionState(),
      engineState: {},
    });
  },
}));
