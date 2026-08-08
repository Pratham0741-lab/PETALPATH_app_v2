/**
 * Shared Interaction State — PetalPath Core Activity Runtime
 */

export interface InteractionState {
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  hintUsageCount: number;
  lastInteractionTime: number;
  inputMode: 'touch' | 'mouse' | 'keyboard';
}

export function createInitialInteractionState(): InteractionState {
  return {
    attempts: 0,
    correctCount: 0,
    incorrectCount: 0,
    hintUsageCount: 0,
    lastInteractionTime: Date.now(),
    inputMode: 'touch',
  };
}
